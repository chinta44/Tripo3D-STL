import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { 
  Download, 
  Box, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Smartphone, 
  Sliders, 
  RefreshCw, 
  Sparkles,
  Heart,
  Eye,
  Activity,
  Layers,
  ArrowRight,
  HelpCircle
} from 'lucide-react';

export interface MotionPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  duration: number; // in seconds
  createClip: (rootName: string, bodyName: string, headName: string, amplitude: number) => THREE.AnimationClip;
}

export const GlbMotionStudio: React.FC = () => {
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [modelName, setModelName] = useState<string>('cat_model');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cat_sit');
  const [motionSpeed, setMotionSpeed] = useState<number>(1.0);
  const [motionIntensity, setMotionIntensity] = useState<number>(1.0);

  // Embedded Animations in loaded GLB (e.g. from Tripo Rig & Animate or Mixamo)
  const [embeddedClips, setEmbeddedClips] = useState<THREE.AnimationClip[]>([]);
  const [selectedEmbeddedClipName, setSelectedEmbeddedClipName] = useState<string | null>(null);
  const [useEmbeddedAnimation, setUseEmbeddedAnimation] = useState<boolean>(false);

  // Target AR height in cm (e.g. 25cm for adult cat, 15cm for kitten)
  const [arHeightCm, setArHeightCm] = useState<number>(25);

  // Generated GLB blob
  const [exportedGlbBlob, setExportedGlbBlob] = useState<Blob | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Three.js refs
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const rawGlbSceneRef = useRef<THREE.Group | null>(null);
  const animatedGroupRef = useRef<THREE.Group | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Node names for rigging
  const rootNodeName = 'AR_Root_Rig';
  const bodyNodeName = 'Cat_Body_Node';
  const headNodeName = 'Cat_Head_Node';

  // 1. Motion presets definition
  const motionPresets: MotionPreset[] = [
    {
      id: 'cat_sit',
      name: 'おすわり・着座 (Sit Down)',
      icon: '🧘',
      description: '腰を床に落として後脚を畳み、前足をピンと立ててちょこんと座る姿勢',
      duration: 4.0,
      createClip: (root, body, head, amp) => {
        const times = [0, 1.0, 2.0, 3.0, 4.0];
        
        // Body Position: Y drops (rear to floor), Z moves slightly back
        const posValues = [
          0, 0, 0,
          0, -0.016 * amp, -0.010 * amp,
          0, -0.017 * amp, -0.010 * amp,
          0, -0.016 * amp, -0.010 * amp,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, times, posValues);

        // Body Rotation: pitch upright so chest is high, hips down
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();
        const pitchAngles = [0, 0.40 * amp, 0.42 * amp, 0.40 * amp, 0];

        for (let i = 0; i < times.length; i++) {
          euler.set(pitchAngles[i], 0, 0);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        }
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, qValues);

        // Breathing scale while sitting
        const scaleTrack = new THREE.VectorKeyframeTrack(
          `${body}.scale`,
          times,
          [1, 1, 1, 1.01 * amp, 1.02 * amp, 1.01 * amp, 1.03 * amp, 1.04 * amp, 1.03 * amp, 1.01 * amp, 1.02 * amp, 1.01 * amp, 1, 1, 1]
        );

        const tracks: THREE.KeyframeTrack[] = [posTrack, rotTrack, scaleTrack];

        // Articulated limbs
        const legFoldQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2 * amp, 0, 0));
        const legZeroQuat = new THREE.Quaternion();
        const legTimes = [0, 1.0, 3.0, 4.0];
        const legBLValues = [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          legFoldQuat.x, legFoldQuat.y, legFoldQuat.z, legFoldQuat.w,
          legFoldQuat.x, legFoldQuat.y, legFoldQuat.z, legFoldQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ];
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_BL.quaternion', legTimes, legBLValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_BR.quaternion', legTimes, legBLValues));

        const frontBraceQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35 * amp, 0, 0));
        const legFLValues = [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          frontBraceQuat.x, frontBraceQuat.y, frontBraceQuat.z, frontBraceQuat.w,
          frontBraceQuat.x, frontBraceQuat.y, frontBraceQuat.z, frontBraceQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ];
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_FL.quaternion', legTimes, legFLValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_FR.quaternion', legTimes, legFLValues));

        const headQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32 * amp, 0, 0));
        const headValues = [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          headQuat.x, headQuat.y, headQuat.z, headQuat.w,
          headQuat.x, headQuat.y, headQuat.z, headQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ];
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Head.quaternion', legTimes, headValues));

        const tailQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6 * amp, 0.4 * amp, 0));
        const tailValues = [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          tailQuat.x, tailQuat.y, tailQuat.z, tailQuat.w,
          tailQuat.x, tailQuat.y, tailQuat.z, tailQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ];
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Tail.quaternion', legTimes, tailValues));

        return new THREE.AnimationClip('Cat_Sit_Down', 4.0, tracks);
      }
    },
    {
      id: 'cat_lie_down',
      name: 'リラックス伏せ・香箱座り (Lie Down / Cat Loaf)',
      icon: '🛌',
      description: '四肢を折りたたんでお腹を床に密着させ、リラックスして落ち着く伏せポーズ',
      duration: 4.5,
      createClip: (root, body, head, amp) => {
        const times = [0, 1.2, 2.2, 3.5, 4.5];

        const posValues = [
          0, 0, 0,
          0, -0.022 * amp, 0,
          0, -0.023 * amp, 0,
          0, -0.022 * amp, 0,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, times, posValues);

        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, [
          0, 0, 0, 1,
          0.02 * amp, 0, 0, 1,
          0.03 * amp, 0, 0, 1,
          0.02 * amp, 0, 0, 1,
          0, 0, 0, 1
        ]);

        const scaleTrack = new THREE.VectorKeyframeTrack(
          `${body}.scale`,
          times,
          [1, 1, 1, 1.02 * amp, 0.98, 1.02 * amp, 1.04 * amp, 0.97, 1.04 * amp, 1.02 * amp, 0.98, 1.02 * amp, 1, 1, 1]
        );

        const tracks: THREE.KeyframeTrack[] = [posTrack, rotTrack, scaleTrack];

        const legFoldTimes = [0, 1.2, 3.5, 4.5];
        const legFoldQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.4 * amp, 0, 0));
        const legFrontFoldQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.3 * amp, 0, 0));
        const legZeroQuat = new THREE.Quaternion();

        const backLegValues = [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          legFoldQuat.x, legFoldQuat.y, legFoldQuat.z, legFoldQuat.w,
          legFoldQuat.x, legFoldQuat.y, legFoldQuat.z, legFoldQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ];
        const frontLegValues = [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          legFrontFoldQuat.x, legFrontFoldQuat.y, legFrontFoldQuat.z, legFrontFoldQuat.w,
          legFrontFoldQuat.x, legFrontFoldQuat.y, legFrontFoldQuat.z, legFrontFoldQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ];

        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_BL.quaternion', legFoldTimes, backLegValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_BR.quaternion', legFoldTimes, backLegValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_FL.quaternion', legFoldTimes, frontLegValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_FR.quaternion', legFoldTimes, frontLegValues));

        const headRestQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.25 * amp, 0, 0));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Head.quaternion', legFoldTimes, [
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
          headRestQuat.x, headRestQuat.y, headRestQuat.z, headRestQuat.w,
          headRestQuat.x, headRestQuat.y, headRestQuat.z, headRestQuat.w,
          legZeroQuat.x, legZeroQuat.y, legZeroQuat.z, legZeroQuat.w,
        ]));

        return new THREE.AnimationClip('Cat_Lie_Down', 4.5, tracks);
      }
    },
    {
      id: 'cat_idle',
      name: '猫の呼吸・喉鳴らし (Purring Idle)',
      icon: '🐱',
      description: 'すやすやと息をするリアルな胸の上下運動と、喉を鳴らす微振動をループ',
      duration: 3.0,
      createClip: (root, body, head, amp) => {
        const times = [0, 0.75, 1.5, 2.25, 3.0];
        
        // Breathing scale track (inhalation / exhalation)
        const scaleValues: number[] = [
          1.0, 1.0, 1.0,
          1.02 * amp, 1.04 * amp, 1.02 * amp,
          1.05 * amp, 1.06 * amp, 1.05 * amp,
          1.02 * amp, 1.03 * amp, 1.02 * amp,
          1.0, 1.0, 1.0
        ];
        const scaleTrack = new THREE.VectorKeyframeTrack(`${body}.scale`, times, scaleValues);

        // Gentle up/down body breathing sway
        const posTimes = [0, 0.75, 1.5, 2.25, 3.0];
        const posValues: number[] = [
          0, 0, 0,
          0, 0.003 * amp, 0,
          0, 0.006 * amp, 0,
          0, 0.002 * amp, 0,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, posTimes, posValues);

        // Subtle head tilt / ear twitch
        const qTimes = [0, 0.75, 1.5, 2.25, 3.0];
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();

        const angles = [0, 0.02 * amp, -0.01 * amp, 0.015 * amp, 0];
        angles.forEach((pitch) => {
          euler.set(pitch, 0, Math.sin(pitch) * 0.02);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        });
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, qTimes, qValues);

        return new THREE.AnimationClip('Cat_Purring_Idle', 3.0, [scaleTrack, posTrack, rotTrack]);
      }
    },
    {
      id: 'cat_look_around',
      name: '首ふり・見回し (Curious Look Around)',
      icon: '🐾',
      description: '左右をキョロキョロ見回しながら、しっぽや背中をしならせる好奇心モーション',
      duration: 4.0,
      createClip: (root, body, head, amp) => {
        const times = [0, 1.0, 2.0, 3.0, 4.0];
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();

        // Yaw angles: Center -> Look Right -> Center -> Look Left -> Center
        const yawAngles = [0, 0.25 * amp, 0, -0.22 * amp, 0];
        const pitchAngles = [0, -0.04 * amp, 0.02 * amp, -0.05 * amp, 0];
        const rollAngles = [0, 0.06 * amp, 0, -0.06 * amp, 0];

        for (let i = 0; i < times.length; i++) {
          euler.set(pitchAngles[i], yawAngles[i], rollAngles[i]);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        }
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, qValues);

        // Slight shift of body center of mass
        const posTimes = [0, 1.0, 2.0, 3.0, 4.0];
        const posValues: number[] = [
          0, 0, 0,
          0.008 * amp, 0.002 * amp, 0,
          0, 0, 0,
          -0.008 * amp, 0.002 * amp, 0,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, posTimes, posValues);

        return new THREE.AnimationClip('Cat_Curious_Look', 4.0, [rotTrack, posTrack]);
      }
    },
    {
      id: 'cat_stretch',
      name: '猫の伸び・ストレッチ (Cat Stretch)',
      icon: '✨',
      description: '前足を伸ばして背中をぐーっと反らせる、猫の定番リラックスストレッチ',
      duration: 3.6,
      createClip: (root, body, head, amp) => {
        const times = [0, 0.9, 1.8, 2.7, 3.6];
        
        // Pitch rotation: Arch down front, lift back
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();
        const pitchAngles = [0, -0.18 * amp, -0.22 * amp, -0.08 * amp, 0];

        for (let i = 0; i < times.length; i++) {
          euler.set(pitchAngles[i], 0, 0);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        }
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, qValues);

        // Lower front Y and pull back Z
        const posValues: number[] = [
          0, 0, 0,
          0, -0.012 * amp, -0.015 * amp,
          0, -0.018 * amp, -0.02 * amp,
          0, -0.008 * amp, -0.008 * amp,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, times, posValues);

        // Spine elongating scale
        const scaleValues: number[] = [
          1.0, 1.0, 1.0,
          0.97, 1.0, 1.08 * amp,
          0.95, 1.0, 1.12 * amp,
          0.98, 1.0, 1.05 * amp,
          1.0, 1.0, 1.0
        ];
        const scaleTrack = new THREE.VectorKeyframeTrack(`${body}.scale`, times, scaleValues);

        return new THREE.AnimationClip('Cat_Stretch', 3.6, [rotTrack, posTrack, scaleTrack]);
      }
    },
    {
      id: 'cat_step_walk',
      name: 'てくてくステップ歩行 (Playful Trot / Step)',
      icon: '🐾',
      description: '四肢のリズミカルな体重移動と、しなやかな上下ボビングの歩行サイクル',
      duration: 1.6,
      createClip: (root, body, head, amp) => {
        const times = [0, 0.4, 0.8, 1.2, 1.6];
        
        // Vertical step bounce
        const posValues: number[] = [
          0, 0, 0,
          0.004 * amp, 0.014 * amp, 0,
          0, 0.002 * amp, 0,
          -0.004 * amp, 0.014 * amp, 0,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, times, posValues);

        // Roll / sway with each paw step
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();
        const rollAngles = [0, 0.06 * amp, 0, -0.06 * amp, 0];
        const pitchAngles = [0, 0.03 * amp, -0.02 * amp, 0.03 * amp, 0];

        for (let i = 0; i < times.length; i++) {
          euler.set(pitchAngles[i], 0, rollAngles[i]);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        }
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, qValues);

        const tracks: THREE.KeyframeTrack[] = [posTrack, rotTrack];

        // Diagonal trot gait (FL with BR, FR with BL)
        const stepQuatFwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42 * amp, 0, 0));
        const stepQuatBwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.42 * amp, 0, 0));
        const stepQuatZero = new THREE.Quaternion();

        const flValues = [
          stepQuatZero.x, stepQuatZero.y, stepQuatZero.z, stepQuatZero.w,
          stepQuatFwd.x, stepQuatFwd.y, stepQuatFwd.z, stepQuatFwd.w,
          stepQuatZero.x, stepQuatZero.y, stepQuatZero.z, stepQuatZero.w,
          stepQuatBwd.x, stepQuatBwd.y, stepQuatBwd.z, stepQuatBwd.w,
          stepQuatZero.x, stepQuatZero.y, stepQuatZero.z, stepQuatZero.w,
        ];
        const frValues = [
          stepQuatZero.x, stepQuatZero.y, stepQuatZero.z, stepQuatZero.w,
          stepQuatBwd.x, stepQuatBwd.y, stepQuatBwd.z, stepQuatBwd.w,
          stepQuatZero.x, stepQuatZero.y, stepQuatZero.z, stepQuatZero.w,
          stepQuatFwd.x, stepQuatFwd.y, stepQuatFwd.z, stepQuatFwd.w,
          stepQuatZero.x, stepQuatZero.y, stepQuatZero.z, stepQuatZero.w,
        ];

        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_FL.quaternion', times, flValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_BR.quaternion', times, flValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_FR.quaternion', times, frValues));
        tracks.push(new THREE.QuaternionKeyframeTrack('Cat_Leg_BL.quaternion', times, frValues));

        return new THREE.AnimationClip('Cat_Playful_Trot', 1.6, tracks);
      }
    },
    {
      id: 'cat_butt_wiggle',
      name: 'お尻フリフリ・飛びかかり前 (Wiggle & Pounce)',
      icon: '🎯',
      description: '獲物を狙ってワクワクしながらお尻を小刻みに振る、愛らしい猫の定番アクション',
      duration: 2.0,
      createClip: (root, body, head, amp) => {
        const times = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        
        // Fast horizontal wiggles
        const posValues: number[] = [];
        for (let i = 0; i < times.length; i++) {
          const swayX = Math.sin(i * Math.PI * 2 / 2) * 0.015 * amp;
          const crouchY = i > 1 && i < 7 ? -0.01 * amp : 0;
          posValues.push(swayX, crouchY, 0);
        }
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, times, posValues);

        // Fast roll twitch
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();
        for (let i = 0; i < times.length; i++) {
          const roll = Math.sin(i * Math.PI) * 0.07 * amp;
          const pitch = i > 1 && i < 7 ? -0.05 * amp : 0;
          euler.set(pitch, 0, roll);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        }
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, qValues);

        return new THREE.AnimationClip('Cat_Pounce_Wiggle', 2.0, [posTrack, rotTrack]);
      }
    },
    {
      id: 'cat_nuzzle',
      name: 'スリスリ・おねだり (Affectionate Nuzzle)',
      icon: '💖',
      description: '飼い主の足元やすり寄り台に頭をすり寄せる、甘えん坊なしぐさ',
      duration: 3.2,
      createClip: (root, body, head, amp) => {
        const times = [0, 0.8, 1.6, 2.4, 3.2];
        const qValues: number[] = [];
        const euler = new THREE.Euler();
        const quat = new THREE.Quaternion();

        const rollAngles = [0, 0.14 * amp, 0.02 * amp, -0.12 * amp, 0];
        const yawAngles = [0, -0.08 * amp, 0, 0.08 * amp, 0];

        for (let i = 0; i < times.length; i++) {
          euler.set(0, yawAngles[i], rollAngles[i]);
          quat.setFromEuler(euler);
          qValues.push(quat.x, quat.y, quat.z, quat.w);
        }
        const rotTrack = new THREE.QuaternionKeyframeTrack(`${body}.quaternion`, times, qValues);

        const posValues: number[] = [
          0, 0, 0,
          0.01 * amp, -0.005 * amp, 0,
          0, 0, 0,
          -0.01 * amp, -0.005 * amp, 0,
          0, 0, 0
        ];
        const posTrack = new THREE.VectorKeyframeTrack(`${body}.position`, times, posValues);

        return new THREE.AnimationClip('Cat_Affectionate_Nuzzle', 3.2, [rotTrack, posTrack]);
      }
    }
  ];

  // 2. Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // Room ground & grid (Bambu / Table style)
    const grid = new THREE.GridHelper(160, 16, 0x334155, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    const plateGeom = new THREE.BoxGeometry(160, 1.5, 160);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.2 });
    const plate = new THREE.Mesh(plateGeom, plateMat);
    plate.position.y = -0.75;
    scene.add(plate);

    // Warm Studio Lighting (great for fur and texture)
    const ambLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(60, 120, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-60, 40, -60);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf472b6, 0.8);
    rimLight.position.set(0, -40, -80);
    scene.add(rimLight);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 45, 120);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 300;
    controlsRef.current = controls;

    // Render loop with AnimationMixer delta
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) {
        mixerRef.current.update(delta * motionSpeed);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [motionSpeed]);

  // 3. Build & Apply Rigged Animation to Loaded Scene
  const applyMotionToScene = useCallback(() => {
    const rawScene = rawGlbSceneRef.current;
    const scene = sceneRef.current;
    if (!rawScene || !scene) return;

    if (animatedGroupRef.current) {
      scene.remove(animatedGroupRef.current);
    }
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    // 1. Create a root rig group
    const rootRig = new THREE.Group();
    rootRig.name = rootNodeName;

    // 2. Create body motion pivot node
    const bodyPivot = new THREE.Group();
    bodyPivot.name = bodyNodeName;

    // Clone clean model
    const clonedModel = rawScene.clone(true);
    const bbox = new THREE.Box3().setFromObject(clonedModel);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Normalize height to 70mm for 3D viewport
    const curH = size.y || 1;
    const scale = 70 / curH;
    clonedModel.scale.set(scale, scale, scale);

    // Center model at bottom (Y=0)
    clonedModel.position.set(
      -center.x * scale,
      -bbox.min.y * scale,
      -center.z * scale
    );
    clonedModel.updateMatrixWorld(true);

    bodyPivot.add(clonedModel);
    rootRig.add(bodyPivot);

    scene.add(rootRig);
    animatedGroupRef.current = rootRig;

    // Set camera target
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 32, 0);
    }

    // 3. Play selected animation
    if (useEmbeddedAnimation && embeddedClips.length > 0) {
      const clip = embeddedClips.find(c => c.name === selectedEmbeddedClipName) || embeddedClips[0];
      const mixer = new THREE.AnimationMixer(clonedModel);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      if (isPlaying) {
        action.play();
      }
      mixerRef.current = mixer;
      activeActionRef.current = action;
    } else {
      const preset = motionPresets.find((p) => p.id === selectedPresetId) || motionPresets[0];
      const clip = preset.createClip(rootNodeName, bodyNodeName, headNodeName, motionIntensity);

      const mixer = new THREE.AnimationMixer(rootRig);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      if (isPlaying) {
        action.play();
      }
      mixerRef.current = mixer;
      activeActionRef.current = action;
    }
  }, [selectedPresetId, motionIntensity, isPlaying, useEmbeddedAnimation, embeddedClips, selectedEmbeddedClipName]);

  // 4. Process loaded GLB buffer
  const processGlbBuffer = async (buffer: ArrayBuffer, name: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setProgressText('GLBモデルを解析＆Meshopt暗号を解凍中...');

    try {
      await MeshoptDecoder.ready;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      loader.parse(
        buffer,
        '',
        (gltf) => {
          rawGlbSceneRef.current = gltf.scene;
          setModelName(name.replace(/\.[^/.]+$/, '').replace(/_meshopt$/i, ''));

          // Detect embedded skeletal animations (e.g. from Tripo Auto-Rig or Mixamo)
          if (gltf.animations && gltf.animations.length > 0) {
            setEmbeddedClips(gltf.animations);
            setSelectedEmbeddedClipName(gltf.animations[0].name || 'Animation_0');
            setUseEmbeddedAnimation(true);
          } else {
            setEmbeddedClips([]);
            setSelectedEmbeddedClipName(null);
            setUseEmbeddedAnimation(false);
          }

          setIsModelLoaded(true);
          setIsLoading(false);
          setProgressText('');
          applyMotionToScene();
        },
        (err) => {
          console.error(err);
          setErrorMsg('GLB解析エラー: ' + (err.message || '形式非対応'));
          setIsLoading(false);
        }
      );
    } catch (e: any) {
      setErrorMsg('読み込み失敗: ' + e.message);
      setIsLoading(false);
    }
  };

  // Generate a cute procedural stylized 3D cat for instant testing
  const loadSampleCatModel = () => {
    setIsLoading(true);
    setProgressText('可愛いサンプル3D猫モデルを生成中...');
    setErrorMsg(null);

    setTimeout(() => {
      try {
        const catGroup = new THREE.Group();
        catGroup.name = 'Sample_Cute_Cat';

        // High quality warm stylized materials
        const orangeFurMat = new THREE.MeshStandardMaterial({
          color: 0xef7c38,
          roughness: 0.8,
          metalness: 0.05,
        });
        const whiteFurMat = new THREE.MeshStandardMaterial({
          color: 0xfdfdfd,
          roughness: 0.8,
          metalness: 0.05,
        });
        const pinkMat = new THREE.MeshStandardMaterial({
          color: 0xf472b6,
          roughness: 0.6,
        });
        const darkEyeMat = new THREE.MeshStandardMaterial({
          color: 0x111827,
          roughness: 0.1,
          metalness: 0.8,
        });
        const eyeGlintMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
        });

        // 1. Torso / Body (elongated capsule)
        const bodyGeom = new THREE.CapsuleGeometry(11, 20, 16, 16);
        const bodyMesh = new THREE.Mesh(bodyGeom, orangeFurMat);
        bodyMesh.rotation.x = Math.PI / 2.3;
        bodyMesh.position.set(0, 18, 0);
        catGroup.add(bodyMesh);

        // White belly patch
        const bellyGeom = new THREE.CapsuleGeometry(9, 16, 12, 12);
        const bellyMesh = new THREE.Mesh(bellyGeom, whiteFurMat);
        bellyMesh.rotation.x = Math.PI / 2.3;
        bellyMesh.position.set(0, 16, 3);
        bellyMesh.scale.set(0.9, 0.9, 0.4);
        catGroup.add(bellyMesh);

        // 2. Head Pivot & Mesh (named Cat_Head for independent head articulation)
        const headPivot = new THREE.Group();
        headPivot.name = 'Cat_Head';
        headPivot.position.set(0, 26, 8);

        const headGeom = new THREE.SphereGeometry(13, 24, 20);
        const headMesh = new THREE.Mesh(headGeom, orangeFurMat);
        headMesh.position.set(0, 5, 2);
        headPivot.add(headMesh);

        // Ears (Cones attached to headPivot)
        const earGeom = new THREE.ConeGeometry(4.5, 7.5, 4);
        const earLeft = new THREE.Mesh(earGeom, orangeFurMat);
        earLeft.position.set(-7.5, 17, 1);
        earLeft.rotation.z = 0.35;
        earLeft.rotation.x = -0.15;
        headPivot.add(earLeft);

        const innerEarGeom = new THREE.ConeGeometry(3.2, 5.5, 4);
        const innerEarLeft = new THREE.Mesh(innerEarGeom, pinkMat);
        innerEarLeft.position.set(-7.5, 17, 2.4);
        innerEarLeft.rotation.z = 0.35;
        innerEarLeft.rotation.x = -0.15;
        headPivot.add(innerEarLeft);

        const earRight = new THREE.Mesh(earGeom, orangeFurMat);
        earRight.position.set(7.5, 17, 1);
        earRight.rotation.z = -0.35;
        earRight.rotation.x = -0.15;
        headPivot.add(earRight);

        const innerEarRight = new THREE.Mesh(innerEarGeom, pinkMat);
        innerEarRight.position.set(7.5, 17, 2.4);
        innerEarRight.rotation.z = -0.35;
        innerEarRight.rotation.x = -0.15;
        headPivot.add(innerEarRight);

        // Muzzle & Pink Nose
        const muzzleGeom = new THREE.SphereGeometry(4.2, 16, 12);
        const muzzleMesh = new THREE.Mesh(muzzleGeom, whiteFurMat);
        muzzleMesh.position.set(0, 2, 12.5);
        muzzleMesh.scale.set(1.4, 0.9, 1.0);
        headPivot.add(muzzleMesh);

        const noseGeom = new THREE.ConeGeometry(1.5, 2.0, 4);
        const noseMesh = new THREE.Mesh(noseGeom, pinkMat);
        noseMesh.position.set(0, 4, 15.5);
        noseMesh.rotation.x = -Math.PI / 2;
        noseMesh.rotation.z = Math.PI;
        headPivot.add(noseMesh);

        // Eyes & Glints
        const eyeGeom = new THREE.SphereGeometry(2.3, 16, 16);
        const eyeLeft = new THREE.Mesh(eyeGeom, darkEyeMat);
        eyeLeft.position.set(-5.5, 6, 12.8);
        headPivot.add(eyeLeft);

        const glintGeom = new THREE.SphereGeometry(0.75, 8, 8);
        const glintLeft = new THREE.Mesh(glintGeom, eyeGlintMat);
        glintLeft.position.set(-4.9, 6.8, 14.3);
        headPivot.add(glintLeft);

        const eyeRight = new THREE.Mesh(eyeGeom, darkEyeMat);
        eyeRight.position.set(5.5, 6, 12.8);
        headPivot.add(eyeRight);

        const glintRight = new THREE.Mesh(glintGeom, eyeGlintMat);
        glintRight.position.set(6.1, 6.8, 14.3);
        headPivot.add(glintRight);

        catGroup.add(headPivot);

        // 3. Articulated Legs (Each leg has its pivot at the shoulder/hip joint)
        const legGeom = new THREE.CylinderGeometry(3.2, 3.5, 14, 12);

        // Front-Left Leg
        const legFLPivot = new THREE.Group();
        legFLPivot.name = 'Cat_Leg_FL';
        legFLPivot.position.set(-6.5, 14, 8);
        const legFLMesh = new THREE.Mesh(legGeom, whiteFurMat);
        legFLMesh.position.set(0, -7, 0);
        legFLPivot.add(legFLMesh);
        catGroup.add(legFLPivot);

        // Front-Right Leg
        const legFRPivot = new THREE.Group();
        legFRPivot.name = 'Cat_Leg_FR';
        legFRPivot.position.set(6.5, 14, 8);
        const legFRMesh = new THREE.Mesh(legGeom, whiteFurMat);
        legFRMesh.position.set(0, -7, 0);
        legFRPivot.add(legFRMesh);
        catGroup.add(legFRPivot);

        // Back-Left Leg
        const legBLPivot = new THREE.Group();
        legBLPivot.name = 'Cat_Leg_BL';
        legBLPivot.position.set(-7.5, 14, -9);
        const legBLMesh = new THREE.Mesh(legGeom, whiteFurMat);
        legBLMesh.position.set(0, -7, 0);
        legBLPivot.add(legBLMesh);
        catGroup.add(legBLPivot);

        // Back-Right Leg
        const legBRPivot = new THREE.Group();
        legBRPivot.name = 'Cat_Leg_BR';
        legBRPivot.position.set(7.5, 14, -9);
        const legBRMesh = new THREE.Mesh(legGeom, whiteFurMat);
        legBRMesh.position.set(0, -7, 0);
        legBRPivot.add(legBRMesh);
        catGroup.add(legBRPivot);

        // 4. Tail with base pivot (named Cat_Tail)
        const tailPivot = new THREE.Group();
        tailPivot.name = 'Cat_Tail';
        tailPivot.position.set(0, 20, -14);

        const tailGeom = new THREE.CylinderGeometry(2.0, 2.6, 20, 10);
        const tailMesh = new THREE.Mesh(tailGeom, orangeFurMat);
        tailMesh.position.set(0, 3, -2);
        tailMesh.rotation.x = -Math.PI / 3.2;
        tailPivot.add(tailMesh);

        const tailTipGeom = new THREE.SphereGeometry(2.3, 10, 10);
        const tailTipMesh = new THREE.Mesh(tailTipGeom, whiteFurMat);
        tailTipMesh.position.set(0, 12, -10);
        tailPivot.add(tailTipMesh);

        catGroup.add(tailPivot);

        rawGlbSceneRef.current = catGroup;
        setModelName('calico_sample_cat');
        setUseEmbeddedAnimation(false);
        setEmbeddedClips([]);
        setSelectedEmbeddedClipName(null);
        setIsModelLoaded(true);
        setIsLoading(false);
        setProgressText('');
        applyMotionToScene();
      } catch (err: any) {
        setErrorMsg('サンプル生成エラー: ' + err.message);
        setIsLoading(false);
      }
    }, 150);
  };

  // Re-apply motion when preset or intensity changes
  useEffect(() => {
    if (isModelLoaded) {
      applyMotionToScene();
    }
  }, [selectedPresetId, motionIntensity, isModelLoaded, applyMotionToScene, useEmbeddedAnimation, selectedEmbeddedClipName]);

  // Handle Play / Pause toggle
  const togglePlayPause = () => {
    if (!activeActionRef.current) return;
    if (isPlaying) {
      activeActionRef.current.paused = true;
      setIsPlaying(false);
    } else {
      activeActionRef.current.paused = false;
      setIsPlaying(true);
    }
  };

  // 5. Export AR-Ready Animated GLB
  const handleExportAnimatedGlb = async () => {
    const rawScene = rawGlbSceneRef.current;
    if (!rawScene) return;

    setIsExporting(true);
    setProgressText('Chrome AR対応ループアニメーション付きGLBを書き出し中...');

    try {
      // 1. Build meter-scaled export rig
      const exportRoot = new THREE.Group();
      exportRoot.name = rootNodeName;

      const exportBodyPivot = new THREE.Group();
      exportBodyPivot.name = bodyNodeName;

      const cloned = rawScene.clone(true);
      const bbox = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      // In glTF: 1 unit = 1 meter!
      // arHeightCm is in cm (e.g. 25cm -> 0.25 meters)
      const targetM = (arHeightCm || 25) / 100;
      const curH = size.y || 1;
      const arScale = targetM / curH;

      cloned.scale.set(arScale, arScale, arScale);
      cloned.position.set(
        -center.x * arScale,
        -bbox.min.y * arScale,
        -center.z * arScale
      );
      cloned.updateMatrixWorld(true);

      exportBodyPivot.add(cloned);
      exportRoot.add(exportBodyPivot);
      exportRoot.updateMatrixWorld(true);

      // 2. Generate animation clip scaled to meter coordinates
      let clipToExport: THREE.AnimationClip;
      let clipNameForFile = selectedPresetId;
      if (useEmbeddedAnimation && embeddedClips.length > 0) {
        const sourceClip = embeddedClips.find(c => c.name === selectedEmbeddedClipName) || embeddedClips[0];
        clipToExport = sourceClip.clone();
        clipNameForFile = clipToExport.name || 'embedded';
      } else {
        const preset = motionPresets.find((p) => p.id === selectedPresetId) || motionPresets[0];
        clipToExport = preset.createClip(rootNodeName, bodyNodeName, headNodeName, motionIntensity);
      }

      // 3. Export via GLTFExporter with animations
      const exporter = new GLTFExporter();
      exporter.parse(
        exportRoot,
        (result) => {
          if (result instanceof ArrayBuffer) {
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            setExportedGlbBlob(blob);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${modelName}_motion_${clipNameForFile}_AR_${arHeightCm}cm.glb`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          }
          setIsExporting(false);
          setProgressText('');
        },
        (err) => {
          console.error(err);
          setErrorMsg('GLTFアニメーションエクスポート失敗: ' + err);
          setIsExporting(false);
        },
        { binary: true, animations: [clipToExport] }
      );
    } catch (e: any) {
      setErrorMsg('エクスポートエラー: ' + e.message);
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Studio Header Banner */}
      <header className="bg-gradient-to-r from-pink-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 border border-pink-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                猫・動物AIモーション付与スタジオ
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                Chrome AR ループ自動再生保証
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                glTF規格 AnimationClip内蔵
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              静止画3D猫に「生命感あるループモーション」を付与
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Tripo3DやMeshyで生成した静止した猫のGLBファイルをアップロードするだけで、<strong className="text-pink-300 font-semibold">「喉を鳴らす呼吸」「見回し」「伸び」「歩行ステップ」「お尻フリフリ」</strong>などの自然な猫らしい動きを自動で組み込み、<strong className="text-indigo-300 font-semibold">Chrome ARで開いた瞬間に部屋の中でずっと動き続けるループGLB</strong>を生成します！
            </p>
          </div>

          {/* Export Action Button */}
          <div className="shrink-0">
            <button
              onClick={handleExportAnimatedGlb}
              disabled={!isModelLoaded || isExporting}
              className={`py-4 px-7 rounded-2xl font-black text-sm shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2.5 ${
                isModelLoaded
                  ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-500/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
              }`}
            >
              <Download className="w-5 h-5 shrink-0" />
              <div className="text-left">
                <div className="leading-tight">
                  {isModelLoaded ? '動き付きAR用GLBを保存' : 'モデルを読み込んでください'}
                </div>
                {isModelLoaded && (
                  <div className="text-[10px] opacity-80 font-normal">
                    実寸 {arHeightCm}cm • Chrome AR無限ループ再生
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 3D Viewport with Live Motion Preview */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-pink-400" />
              <h2 className="font-bold text-white text-base">リアルタイム・モーションプレビュー</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                60 FPS ループ中
              </span>
            </div>

            {/* Playback Controls */}
            {isModelLoaded && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? '一時停止' : '再生'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (controlsRef.current && cameraRef.current) {
                      cameraRef.current.position.set(0, 45, 120);
                      controlsRef.current.target.set(0, 32, 0);
                    }
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="視点リセット"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 3D Canvas */}
          <div className="relative w-full h-[460px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Empty State */}
            {!isModelLoaded && !isLoading && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-4 shadow-lg shadow-pink-500/10 animate-pulse">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  猫のGLBファイルをアップロード または サンプル猫で体験
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                  右側のエリアにファイルをドロップするか、下のボタンを押すと可愛いサンプル猫が今すぐ動き出します！
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-4">
                  <button
                    type="button"
                    onClick={loadSampleCatModel}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-pink-500/25 transition cursor-pointer flex items-center gap-2 transform active:scale-95"
                  >
                    <span>🐾 サンプル猫モデルで今すぐ動かす</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('cat-motion-file-input')?.click()}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-2 border border-slate-700"
                  >
                    <Upload className="w-3.5 h-3.5 text-pink-400" />
                    <span>手元のGLBを選択</span>
                  </button>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                  <span>Chrome AR (Google Scene Viewer) 自動ループ再生規格に完全準拠</span>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <RefreshCw className="w-10 h-10 text-pink-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-white mb-1">{progressText || '処理中...'}</p>
                <p className="text-xs text-pink-300/80">Meshopt暗号を解凍しモーションリグを構築しています</p>
              </div>
            )}
          </div>

          {/* Speed & Amplitude Controls Bar */}
          {isModelLoaded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>動きの速度 (テンポ):</span>
                  <span className="font-mono font-bold text-pink-300">{motionSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={motionSpeed}
                  onChange={(e) => setMotionSpeed(parseFloat(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>動きの大きさ (振幅・激しさ):</span>
                  <span className="font-mono font-bold text-indigo-300">{Math.round(motionIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.1"
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* AR Playback Guarantee Note */}
          {isModelLoaded && (
            <div className="bg-gradient-to-r from-pink-950/30 via-slate-900 to-indigo-950/30 p-4 rounded-2xl border border-pink-500/30 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-pink-300 font-bold">
                <span>📱 Chrome AR（Scene Viewer）での自動ループ再生について</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                エクスポートされるGLBには、glTF公式の<strong className="text-white">標準AnimationClipトラック</strong>が埋め込まれています。<br />
                スマホのChromeで開くと、AR空間に猫が出現した瞬間から<strong className="text-emerald-300 font-bold">追加のタップ操作なしで自動的にループ再生</strong>が始まります。指定した実寸（{arHeightCm}cm）で床や机の上に猫が立ち、可愛く動き続けます！
              </p>
            </div>
          )}
        </div>

        {/* Right: Upload & Motion Presets */}
        <div className="lg:col-span-5 space-y-6">
          {/* File Upload Dropzone */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">猫のGLBファイルを選択</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
                1ステップ自動付与
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tripo3DやMeshy等からダウンロードした静止状態の猫のGLB（またはMeshopt圧縮GLB）をドロップしてください。
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  file.arrayBuffer().then((buf) => processGlbBuffer(buf, file.name));
                }
              }}
              onClick={() => document.getElementById('cat-motion-file-input')?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragOver 
                  ? 'border-pink-400 bg-pink-500/10 scale-[1.01]' 
                  : 'border-slate-700 hover:border-pink-500/50 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              <input
                id="cat-motion-file-input"
                type="file"
                accept=".glb,.gltf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    file.arrayBuffer().then((buf) => processGlbBuffer(buf, file.name));
                  }
                }}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 text-2xl">
                🐱
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  クリックして猫のGLBを選択 / ドロップ
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  静止ポーズのモデルが生命感たっぷりに動き出します
                </p>
              </div>
            </div>

            {/* Instant Sample Cat Model Button */}
            <button
              type="button"
              onClick={loadSampleCatModel}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-950/80 via-slate-900 to-indigo-950/80 hover:from-pink-900/90 hover:to-indigo-900/90 border border-pink-500/40 text-pink-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>🐾 手元にファイルがない？サンプル猫で今すぐ試す</span>
            </button>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Embedded Animations Selector (if uploaded GLB has bones & clips) */}
          {embeddedClips.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 rounded-3xl border border-emerald-500/40 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">GLB内蔵ボーンアニメーション検出！</h3>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  全{embeddedClips.length}種類
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                このGLBにはTripo/Mixamo等で付けられた<strong className="text-emerald-300">本物の骨格（ボーン）アニメーション</strong>が内蔵されています。選択してそのままAR実寸出力できます。
              </p>

              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUseEmbeddedAnimation(true)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    useEmbeddedAnimation
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  内蔵ボーンを再生
                </button>
                <button
                  type="button"
                  onClick={() => setUseEmbeddedAnimation(false)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    !useEmbeddedAnimation
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  スタジオ自動モーション
                </button>
              </div>

              {useEmbeddedAnimation && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {embeddedClips.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedEmbeddedClipName(c.name)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                        selectedEmbeddedClipName === c.name
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-md'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {c.duration.toFixed(1)}s
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Motion Presets Selection */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-base">猫らしいモーションを選ぶ</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">全{motionPresets.length}種類</span>
            </div>

            <p className="text-xs text-slate-400">
              ※ 「おすわり」「伏せ」「歩行」は関節連動に対応。サンプル猫では実際に脚が折れ曲がり腰が落ちます！
            </p>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {motionPresets.map((preset) => {
                const isSelected = !useEmbeddedAnimation && selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setUseEmbeddedAnimation(false);
                      setSelectedPresetId(preset.id);
                    }}
                    className={`w-full p-3 rounded-2xl text-left transition flex items-start gap-3 cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-950/60 to-purple-950/40 border-pink-500/60 shadow-lg shadow-pink-500/10'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-2xl shrink-0 mt-0.5">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-bold ${isSelected ? 'text-pink-300' : 'text-white'}`}>
                          {preset.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {preset.duration}秒ループ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Joint Insight Callout */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-pink-950/40 border border-indigo-500/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <span>💡 「モデル全体が揺れる」理由と、本物の関節で座らせる方法</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              AIが初期生成した3Dモデルは**「中身のない1枚の硬い皮（石像状態）」**のため、ボーンがないと全体を揺らすことしかできません。<br />
              しかし、**Tripo3Dの画面内で『Rig（骨入れ）』ボタンを押してからダウンロードしたGLB**をこのアプリにドロップすると、AIが埋め込んだ本物の四足骨格アニメーション（座る・走る・歩く）を自動認識してそのままChrome ARで動かせます！
            </p>
          </div>

          {/* AR Real-World Height Adjuster */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-pink-950/30 rounded-3xl border border-indigo-500/40 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">AR出現時の実寸サイズ</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                実寸 {arHeightCm} cm
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              スマホのChrome ARで部屋に猫が出現した時の現実サイズを指定します。
            </p>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15cm', cm: 15, note: '子猫・卓上' },
                { label: '25cm', cm: 25, note: '成猫・標準' },
                { label: '35cm', cm: 35, note: '大型猫' },
                { label: '50cm', cm: 50, note: 'ビッグ展示' },
              ].map((p) => (
                <button
                  key={p.cm}
                  type="button"
                  onClick={() => setArHeightCm(p.cm)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center cursor-pointer border ${
                    arHeightCm === p.cm
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[11px] font-mono">{p.label}</span>
                  <span className={`text-[9px] font-normal ${arHeightCm === p.cm ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {p.note}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="5"
                max="100"
                step="1"
                value={arHeightCm}
                onChange={(e) => setArHeightCm(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-400 cursor-pointer"
              />
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={arHeightCm}
                  onChange={(e) => setArHeightCm(parseFloat(e.target.value) || 25)}
                  className="w-12 bg-transparent text-right font-mono font-bold text-sm text-indigo-300 focus:outline-none"
                />
                <span className="text-xs text-slate-400">cm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AR Loop Motion Guide & FAQ */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-6 h-6 text-pink-400" />
          <h3 className="font-bold text-white text-lg">
            ARで猫のループアニメーションを使うためのQ&Aと仕組み
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="font-bold text-white text-sm">スマホでの表示方法</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              エクスポートしたGLBファイルをスマホに送り、Android Chromeやファイルマネージャーで開いて「自分のスペースで表示（AR）」をタップするだけです。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="font-bold text-white text-sm">自動で無限ループする理由</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Google Scene ViewerはglTF標準の第一トラックにあるアニメーションを自動再生する仕様になっています。本スタジオはその規格通りにAnimationClipをエンコードしています。
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="font-bold text-white text-sm">実寸スケール保証</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              glTFの国際規格（1 unit = 1m）に合わせ、指定したcmサイズ（例: 25cm＝0.25m）に自動変換。床・机の接地（Y=0）も自動補正されるため、巨大化・縮小化の心配がありません。
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5 space-y-4 text-xs">
          <div className="space-y-1.5">
            <h5 className="font-bold text-white flex items-center gap-2">
              <span className="text-pink-400">Q.</span> どんな3Dファイルに対応していますか？
            </h5>
            <p className="text-slate-400 leading-relaxed pl-5">
              Tripo3DやMeshyで生成した静止状態の猫や動物のGLB、Meshopt圧縮されたGLB、BlenderやSketchfabからダウンロードしたGLB/glTFに対応しています。モデル内に骨（ボーン）がなくても、外側から自然な重心・呼吸・首振りリグを自動構成して動かします。
            </p>
          </div>

          <div className="space-y-1.5">
            <h5 className="font-bold text-white flex items-center gap-2">
              <span className="text-pink-400">Q.</span> 他の動物（犬やウサギ、ドラゴンなど）にも使えますか？
            </h5>
            <p className="text-slate-400 leading-relaxed pl-5">
              はい！猫向けにチューニングされていますが、犬、クマ、ウサギ、パンダ、キャラクターフィギュアなどにもそのまま適用可能です。「呼吸」「見回し」「歩行」など生物共通の自然なしぐさをお楽しみいただけます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
