# FloraScan Expo Mobile App

> **Note**: This repository contains the public version of the **FloraScan** Expo mobile application, developed as part of my Final Year Project (FYP).
> 
> **Note**: This repository contains the public version of the **FloraScan** Expo mobile application, developed as part of my Final Year Project (FYP).
> 
> **Note**: This repository contains the public version of the **FloraScan** Expo mobile application, developed as part of my Final Year Project (FYP).

FloraScan is an Expo-based React Native mobile application designed to detect plant species and identify plant diseases using machine learning models, offering offline inference, historical logging, and interactive care instructions.

## Tech Stack & Features
- **Core Framework**: React Native with Expo (SDK 51) and Expo Router (File-based routing)
- **State Management**: Zustand stores
- **UI Architecture**: Model-View-ViewModel (MVVM) pattern
- **Database**: SQLite (via `expo-sqlite`) for offline-first synchronization
- **Model Inference**: TensorFlow.js / ONNX model execution locally on-device
- **Backend Sync**: Firebase Auth & Firebase Firestore for cloud backups

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- `pnpm` (preferred package manager) or `npm`

### Installation
1. Install the project dependencies:
   ```bash
   pnpm install
   ```

2. Start the Expo development server:
   ```bash
   pnpm expo start
   ```

3. Open the app on your preferred platform:
   - Press `a` for Android Emulator
   - Press `i` for iOS Simulator
   - Scan the QR code with the Expo Go app on a physical device
