declare module 'three/examples/jsm/geometries/RoundedBoxGeometry.js' {
  export const RoundedBoxGeometry: any;
}

declare module 'three/examples/jsm/loaders/RGBELoader.js' {
  import { DataTexture } from 'three';
  export class RGBELoader {
    load(
      url: string,
      onLoad?: (texture: DataTexture) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): DataTexture;
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import { Group, LoadingManager } from 'three';
  export interface GLTF {
    scene: Group;
    scenes: Group[];
    cameras: unknown[];
    animations: unknown[];
    asset: unknown;
  }
  export class GLTFLoader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad?: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
}

