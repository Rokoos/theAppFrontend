import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { mockEncrypt, mockDecrypt } from '../utils/mockCrypto';
import { getSkinImage } from '../utils/skins';
import { API_BASE_URL } from '../api';

const MAX_TEXTURE_SIZE = 2048;
const MAX_TOTAL_BUFFER_BYTES = 32 * 1024 * 1024;

const CARD_THICKNESS = 0.08;
const GAP = 0.3; // visual gap between cards
const GRID_FILL = 0.94; // leave some breathing room around grid
const GRID_MARGIN = 0.03;
const CARD_PADDING = 0.07;

const CORNER_RADIUS_REL = 0.08;
const BORDER_COLOR = 0xd2d9e6;
const BORDER_OPACITY = 0.85;

// HDR environment for realistic metallic reflections (studio lighting)
const HDR_ENV_URL =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr';

export type SkinCard = {
  name: string;
  description: string;
  iconUrl: string;
  gameLabel?: string;
  isMock?: boolean;
  mockIndex?: number;
  /** Float/wear 0–1: lower = Factory New (shinier), higher = Battle-Scarred (duller). Used for roughness. */
  wear?: number;
};

/** Lower wear = shinier (lower roughness). CS2 float 0–1. */
function getRoughnessFromWear(wear: number | undefined): number {
  if (wear == null || Number.isNaN(wear)) return 0.22;
  const c = Math.max(0, Math.min(1, wear));
  return 0.1 + c * 0.55;
}

/**
 * Apply skin material to all meshes in a loaded GLTF scene (e.g. weapon model).
 * Use with GLTFLoader: after load, call applySkinMaterialToGltf(gltf.scene, skinTexture, wear)
 * so the weapon model meshes use MeshStandardMaterial with metalness 1 and roughness from wear.
 */
export function applySkinMaterialToGltf(
  scene: THREE.Group,
  mapTexture: THREE.Texture,
  wear?: number
): void {
  const roughness = getRoughnessFromWear(wear);
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const mesh = object as THREE.Mesh;
    if (!mesh.geometry) return;
    const oldMat = mesh.material;
    if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
    else if (oldMat && typeof (oldMat as THREE.Material).dispose === 'function')
      (oldMat as THREE.Material).dispose();
    mesh.material = new THREE.MeshStandardMaterial({
      map: mapTexture,
      metalness: 1.0,
      roughness,
      envMapIntensity: 1,
    });
  });
}

const TEST_INVENTORY: SkinCard[] = [];

type Props = {
  skins?: SkinCard[];
  onSkinSelect?: (skin: SkinCard) => void;
  maxCards?: number;
};

export const WebGLCanvas: React.FC<Props> = ({ skins = [], onSkinSelect, maxCards }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalBufferBytesRef = useRef(0);
  const [hoverLabel, setHoverLabel] = useState<{ name: string; x: number; y: number } | null>(null);
  const [decryptedGallery, setDecryptedGallery] = useState<SkinCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await mockEncrypt(JSON.stringify(TEST_INVENTORY));
        const decrypted = await mockDecrypt(payload);
        const parsed = JSON.parse(decrypted) as SkinCard[];
        if (!cancelled) setDecryptedGallery(parsed);
      } catch {
        if (!cancelled) setDecryptedGallery([...TEST_INVENTORY]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const baseItems = skins.length > 0 ? skins : (decryptedGallery ?? TEST_INVENTORY);
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || baseItems.length === 0) return;

    // Always render up to 8 cards for gallery by default,
    // but allow overriding (e.g. single-card modal view).
    const limit = Math.max(1, maxCards ?? 8);
    const sourceCount = Math.min(baseItems.length, limit);
    const items: SkinCard[] = [];
    for (let i = 0; i < limit; i += 1) {
      const src = baseItems[i % sourceCount];
      items.push({
        ...src,
        name: `${src.name} #${i + 1}`,
      });
    }
    const isSingleCard = items.length === 1;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    const scene = new THREE.Scene();
    // Default background; replaced by HDR env when loaded
    scene.background = new THREE.Color('#020314');
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const cardMeshes: THREE.Mesh[] = [];
    const cardTargetScale = new Map<THREE.Mesh, number>();
    const cardTargetQuat = new Map<THREE.Mesh, THREE.Quaternion>();
    const tempQuat = new THREE.Quaternion();
    const tempVec = new THREE.Vector3();
    const hoverVec = new THREE.Vector3();

    type CardEntry = {
      mesh: THREE.Mesh;
      border: THREE.LineSegments;
      texture: THREE.Texture;
      skin: SkinCard;
    };
    const cards: CardEntry[] = [];

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (animationId !== null) cancelAnimationFrame(animationId);
    };

    const handleContextRestored = () => {
      init();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    const allocateBuffer = (byteLength: number) => {
      const nextTotal = totalBufferBytesRef.current + byteLength;
      if (nextTotal > MAX_TOTAL_BUFFER_BYTES) throw new Error('GPU memory limit exceeded');
      totalBufferBytesRef.current = nextTotal;
    };

    const updateMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (event: MouseEvent) => {
      updateMouse(event);
      if (!camera) return;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cardMeshes);
      cardMeshes.forEach((mesh) => {
        cardTargetScale.set(mesh, 1);
        cardTargetQuat.set(mesh, (mesh as THREE.Mesh).quaternion.clone());
      });
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const skin = (mesh.userData as { skin?: SkinCard }).skin;
        cardTargetScale.set(mesh, 1.1);
        // Gentle tilt toward cursor (avoid extreme rotations).
        tempVec.set(mouse.x * 0.35, mouse.y * 0.35, 0.9).unproject(camera);
        tempVec.sub(camera.position).normalize();
        tempQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tempVec);
        cardTargetQuat.set(mesh, tempQuat.clone());
        if (skin) {
          const rect = canvas.getBoundingClientRect();
          const topOffset = (mesh.userData as { cardHeight?: number }).cardHeight ?? 1.6;
          const v = new THREE.Vector3(0, topOffset * 0.5, 0).applyMatrix4(mesh.matrixWorld).project(camera);
          setHoverLabel({
            name: skin.name,
            x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (-v.y * 0.5 + 0.5) * rect.height
          });
        }
      } else {
        setHoverLabel(null);
      }
    };

    const handlePointerLeave = () => {
      setHoverLabel(null);
      cardMeshes.forEach((m) => {
        cardTargetScale.set(m, 1);
        cardTargetQuat.set(m, (m as THREE.Mesh).quaternion.clone());
      });
    };

    const handleClick = (event: MouseEvent) => {
      updateMouse(event);
      if (!camera) return;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cardMeshes);
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const skin = (mesh.userData as { skin?: SkinCard }).skin;
        if (skin && onSkinSelect) onSkinSelect(skin);
      }
    };

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const getColumns = (w: number) => {
      // Keep 1 column until wider, so layout matches narrow screens (e.g. at 455px).
      // < 600px: 1 column
      // 600–899px: 2 columns
      // >= 900px: 3 columns
      if (w < 600) return 1;
      if (w < 900) return 2;
      return 3;
    };

    // Fixed aspect ratio (width : height = 8 : 5), same as at 700px, at all screen widths.
    const CANVAS_ASPECT = 5 / 8; // height / width

    const getCanvasSize = () => {
      const w = Math.max(260, container.clientWidth || 320);
      const h = Math.max(260, Math.round(w * CANVAS_ASPECT));
      return { w, h };
    };

    const computeLayout = (w: number, h: number, count: number) => {
      const cols = getColumns(w);
      const rows = Math.ceil(count / cols);

      const camDist = 4.9; // closer camera -> bigger cards
      const vFov = (46 * Math.PI) / 180;
      const visibleHeight = 2 * camDist * Math.tan(vFov / 2);
      const visibleWidth = visibleHeight * (w / h);

      const usableW = visibleWidth * (1 - 2 * GRID_MARGIN) * GRID_FILL;
      const usableH = visibleHeight * (1 - 2 * GRID_MARGIN) * GRID_FILL;

      const cardWidth = (usableW - (cols - 1) * GAP) / cols;
      const cardHeight = (usableH - (rows - 1) * GAP) / rows;

      const totalW = cols * cardWidth + (cols - 1) * GAP;
      const totalH = rows * cardHeight + (rows - 1) * GAP;
      const startX = -totalW / 2 + cardWidth / 2 + GAP / 2;
      const startY = totalH / 2 - cardHeight / 2 - GAP / 2;

      return { cols, rows, cardWidth, cardHeight, startX, startY, camDist, vFov };
    };

    const reflow = () => {
      if (!renderer || !camera) return;
      const { w, h } = getCanvasSize();
      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      const layout = computeLayout(w, h, cards.length);
      camera.fov = (layout.vFov * 180) / Math.PI;
      camera.position.set(0, 0, layout.camDist);
      camera.updateProjectionMatrix();

      const radius = Math.min(layout.cardWidth, layout.cardHeight) * CORNER_RADIUS_REL;
      cards.forEach((entry, i) => {
        const col = i % layout.cols;
        const row = Math.floor(i / layout.cols);
        const x = layout.startX + col * (layout.cardWidth + GAP);
        const y = layout.startY - row * (layout.cardHeight + GAP);

        // update position
        entry.mesh.position.set(x, y, 0);

        // update geometry (so rounded corners stay correct at all sizes)
        const newGeo = new RoundedBoxGeometry(
          layout.cardWidth,
          layout.cardHeight,
          CARD_THICKNESS,
          3,
          radius
        );
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = newGeo;
        entry.mesh.userData.cardHeight = layout.cardHeight;

        // update border geometry to match
        const edges = new THREE.EdgesGeometry(newGeo, 28);
        entry.border.geometry.dispose();
        entry.border.geometry = edges;
      });
    };

    const onResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        reflow();
      }, 60);
    };

    const init = () => {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const { w, h } = getCanvasSize();
      renderer.setSize(w, h);

      camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
      camera.position.set(0, 0, 4.9);

      allocateBuffer(2 * 1024 * 1024);

      const ambient = new THREE.AmbientLight(0x404060, 0.6);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.3);
      dir.position.set(5, 7, 6);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.near = 0.5;
      dir.shadow.camera.far = 20;
      dir.shadow.camera.left = dir.shadow.camera.bottom = -5;
      dir.shadow.camera.right = dir.shadow.camera.top = 5;
      dir.shadow.bias = -0.0001;
      scene.add(dir);

      // HDR environment map for realistic metallic/glossy reflections on skins
      const applyEnvMap = (envMap: THREE.Texture) => {
        if (cancelled) {
          envMap.dispose();
          return;
        }
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = envMap;
        scene.background = envMap;
        scene.backgroundBlurriness = 0.5;
        scene.backgroundIntensity = 0.45;
      };
      const rgbeLoader = new RGBELoader();
      rgbeLoader.load(
        HDR_ENV_URL,
        applyEnvMap,
        undefined,
        () => {
          // Fallback: try local asset (place studio_small_08_1k.hdr in public/assets/)
          rgbeLoader.load('/assets/studio_small_08_1k.hdr', applyEnvMap, undefined, () => {});
        }
      );

      const loader = new THREE.TextureLoader();
      const maxItems = Math.min(items.length, 8);
      const displayItems = items.slice(0, maxItems);

      const loadCardTexture = (skin: SkinCard) => {
        const primaryUrl = getSkinImage(skin.name, { iconUrl: skin.iconUrl });
        const proxyPath = `/api/images/proxy?url=${encodeURIComponent(primaryUrl)}`;
        const textureUrl =
          primaryUrl.startsWith("http://") || primaryUrl.startsWith("https://")
            ? `${API_BASE_URL.replace(/\/$/, "")}${proxyPath}`
            : primaryUrl;

        const addCardWithTexture = (texture: THREE.Texture) => {
          if (cancelled) return;
          texture.anisotropy = renderer ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 4;
          if (texture.image && "width" in texture.image && texture.image.width > MAX_TEXTURE_SIZE) {
            texture.image.width = MAX_TEXTURE_SIZE;
          }
          const geometry = new RoundedBoxGeometry(1, 1, CARD_THICKNESS, 5, 0.12);
          const roughness = getRoughnessFromWear(skin.wear);
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 1.0,
            roughness,
            transparent: true,
          });
          const card = new THREE.Mesh(geometry, material);
          card.castShadow = true;
          card.receiveShadow = true;
          card.userData.skin = skin;
          cardMeshes.push(card);
          cardTargetScale.set(card, 1);
          cardTargetQuat.set(card, card.quaternion.clone());
          scene.add(card);
          const edges = new THREE.EdgesGeometry(geometry, 28);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: BORDER_COLOR, transparent: true, opacity: BORDER_OPACITY }),
          );
          card.add(line);
          texture.repeat.set(1 - CARD_PADDING * 2, 1 - CARD_PADDING * 2);
          texture.offset.set(CARD_PADDING, CARD_PADDING);
          cards.push({ mesh: card, border: line, texture, skin });
          reflow();
        };

        const loadWithFallback = (url: string, isFallback = false) => {
          loader.setCrossOrigin("anonymous");
          loader.load(
            url,
            (texture: THREE.Texture) => {
              addCardWithTexture(texture);
            },
            undefined,
            () => {
              if (isSingleCard && !isFallback) {
                if (cancelled) return;
                const size = 4;
                const data = new Uint8Array(size * size * 4);
                for (let i = 0; i < data.length; i += 4) {
                  data[i] = 100;
                  data[i + 1] = 100;
                  data[i + 2] = 100;
                  data[i + 3] = 255;
                }
                const fallbackTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
                fallbackTexture.needsUpdate = true;
                addCardWithTexture(fallbackTexture);
                return;
              }
              if (isFallback) return;
            },
          );
        };

        loadWithFallback(textureUrl);
      };

      displayItems.forEach((skin) => {
        loadCardTexture(skin);
      });

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const t = 0.12;
        cardMeshes.forEach((mesh) => {
          const targetS = cardTargetScale.get(mesh) ?? 1;
          mesh.scale.lerp(new THREE.Vector3(targetS, targetS, targetS), t);
          const targetQ = cardTargetQuat.get(mesh);
          if (targetQ) mesh.quaternion.slerp(targetQ, t);
        });
        renderer?.render(scene, camera as THREE.Camera);
      };

      animate();
    };

    let resizeObserver: ResizeObserver | null = null;
    try {
      init();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', onResize);
        if (container && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => onResize());
          resizeObserver.observe(container);
        }
      }
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerleave', handlePointerLeave);
      canvas.addEventListener('pointerdown', handleClick);
    } catch {
      // swallow GPU limit errors
    }

    return () => {
      cancelled = true;
      if (resizeObserver && container) {
        resizeObserver.disconnect();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
      }
      if (resizeTimeout) clearTimeout(resizeTimeout);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerdown', handleClick);
      if (animationId !== null) cancelAnimationFrame(animationId);
      cardMeshes.forEach((m) => {
        if (Array.isArray(m.material)) m.material.forEach((mat: THREE.Material) => mat.dispose());
        else if (m.material && 'dispose' in m.material) (m.material as THREE.Material).dispose();
        if (m.geometry) m.geometry.dispose();
        m.children.forEach((child: THREE.Object3D) => {
          if (child instanceof THREE.LineSegments) {
            child.geometry?.dispose();
            (child.material as THREE.Material)?.dispose();
          }
        });
      });
      if (renderer) renderer.dispose();
    };
  }, [skins, decryptedGallery, onSkinSelect]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        minWidth: '100%',
        aspectRatio: '8 / 5',
        flex: '1 1 100%',
        display: 'block',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: 12,
          background: '#020617',
        }}
      />
      {hoverLabel && (
        <div
          style={{
            position: 'fixed',
            left: hoverLabel.x,
            top: hoverLabel.y,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            pointerEvents: 'none',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#e5e7eb',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 10
          }}
        >
          {hoverLabel.name}
        </div>
      )}
    </div>
  );
}
