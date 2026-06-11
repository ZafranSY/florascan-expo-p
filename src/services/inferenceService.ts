import { ScanResult } from '@/models/ScanResult';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export class InferenceService {
  private static instance: InferenceService;
  private model: tf.LayersModel | tf.GraphModel | null = null;
  private isInitializing: boolean = false;

  private readonly LABELS = [
    'Anthracnose', 'BacterialSpot', 'Curl', 'Healthy', 
    'Mealybug', 'Mite', 'Mosaic', 'PotashDeficiency', 'Ringspot'
  ];

  private constructor() { }

  static getInstance(): InferenceService {
    if (!InferenceService.instance) {
      InferenceService.instance = new InferenceService();
    }
    return InferenceService.instance;
  }

  async init() {
    if (this.model || this.isInitializing) return;
    this.isInitializing = true;

    console.log('TFJS: Starting engine initialization...');
    try {
      await tf.ready();
      console.log('TFJS: Engine is ready');

      try {
        console.log('TFJS: Loading model from assets...');
        const modelJson = require('../assets/models/model.json');
        const modelWeights = [
          require('../assets/models/group1-shard1of4.bin'),
          require('../assets/models/group1-shard2of4.bin'),
          require('../assets/models/group1-shard3of4.bin'),
          require('../assets/models/group1-shard4of4.bin'),
        ];

        console.log('TFJS: Attempting loadLayersModel...');
        const model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));

        console.log('TFJS: Model structure check...');
        if (!model.layers || model.layers.length === 0) {
          throw new Error('Model has no layers!');
        }

        console.log(`TFJS: Model loaded. Input shape: ${JSON.stringify(model.inputs[0].shape)}`);
        this.model = model;
        console.log('TFJS: Initialization complete');
      } catch (fileError) {
        console.warn('TFJS: Local model failed to load. Falling back to server.', fileError);
        this.model = null;
        try {
          const { useSettingsStore } = require('../stores/settingsStore');
          useSettingsStore.getState().setModelVersion('server');
        } catch (e) {
          console.error('Failed to set modelVersion to server in fileError catch:', e);
        }
      }
    } catch (error) {
      console.error('TFJS: Critical initialization error:', error);
      try {
        const { useSettingsStore } = require('../stores/settingsStore');
        useSettingsStore.getState().setModelVersion('server');
      } catch (e) {
        console.error('Failed to set modelVersion to server in critical error catch:', e);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  private async preprocessImage(imageUri: string): Promise<tf.Tensor> {
    console.log(`TFJS: Preprocessing image: ${imageUri}`);
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 224, height: 224 } }],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    console.log('TFJS: Reading image file...');
    const imgB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: 'base64',
    });

    const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
    const raw = new Uint8Array(imgBuffer);

    console.log('TFJS: Decoding and creating tensor...');
    const tensor4D = tf.tidy(() => {
      const tensor3D = decodeJpeg(raw);
      console.log(`TFJS: Tensor shape before expand: ${tensor3D.shape}`);
      return tensor3D.expandDims(0).cast('float32');
    });

    console.log(`TFJS: Preprocessing complete. Tensor shape: ${tensor4D.shape}`);
    return tensor4D;
  }

  // Instructed as "predict(imageUri)" but called "runInference" in the ViewModel
  async runInference(imageUri: string): Promise<ScanResult> {
    await this.init();

    if (!this.model) {
      throw new Error("Model failed to load before inference.");
    }

    try {
      console.log(`Analyzing image with TFJS: ${imageUri}`);

      const imageTensor = await this.preprocessImage(imageUri);

      console.log('TFJS: Running model prediction...');
      const { confidence, diseaseIndex, secondaryDisease, secondaryConfidence } = tf.tidy(() => {
        const prediction = this.model!.predict(imageTensor) as tf.Tensor;
        console.log(`TFJS: Raw prediction: ${prediction.toString()}`);

        const values = Array.from(prediction.dataSync());
        // Map to objects with index and score
        const scoredIndices = values.map((score, index) => ({ index, score }));
        // Sort descending
        scoredIndices.sort((a, b) => b.score - a.score);

        const primary = scoredIndices[0];
        let secDisease: string | undefined = undefined;
        let secConf: number | undefined = undefined;

        if (primary.score < 0.70 && scoredIndices.length > 1) {
          const secondary = scoredIndices[1];
          if (secondary.score >= 0.15) {
            secDisease = this.LABELS[secondary.index] || `Unknown Class (${secondary.index})`;
            secConf = secondary.score;
          }
        }

        return {
          confidence: primary.score,
          diseaseIndex: primary.index,
          secondaryDisease: secDisease,
          secondaryConfidence: secConf,
        };
      });

      // Frees the input tensor manually since it was generated asynchronously
      imageTensor.dispose();

      const disease = this.LABELS[diseaseIndex] || `Unknown Class (${diseaseIndex})`;
      console.log(`Prediction: ${disease} - ${(confidence * 100).toFixed(2)}%`);
      if (secondaryDisease) {
        console.log(`Secondary Prediction: ${secondaryDisease} - ${(secondaryConfidence! * 100).toFixed(2)}%`);
      }

      return {
        id: Crypto.randomUUID(),
        disease,
        confidence,
        modelVersion: 'tfjs-local-v1',
        imageUri,
        scannedAt: new Date(),
        isSynced: false,
        secondaryDisease,
        secondaryConfidence,
      };
    } catch (error) {
      console.error('TFJS Inference error', error);
      throw error;
    }
  }
}

export const inferenceService = InferenceService.getInstance();
