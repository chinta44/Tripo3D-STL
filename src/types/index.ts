export type TabType = 'tripo-converter' | 'studio' | 'verdict' | 'colab-free' | 'checker' | 'meshy-details' | 'comparison' | 'viewer' | 'workflow';

export interface GpuOption {
  id: string;
  name: string;
  vram: number; // in GB, 0 for iGPU
  type: 'nvidia' | 'amd' | 'intel' | 'apple' | 'none';
  tier: 'none' | 'entry' | 'mid' | 'high' | 'ultra';
}

export interface AiModelComparison {
  id: string;
  name: string;
  provider: string;
  type: 'cloud' | 'local';
  license: string;
  cost: string;
  minVram: number;
  recommendedVram: number;
  gpuRequirement: string;
  qualityScore: number; // 1-10
  printReadinessScore: number; // 1-10
  generationTime: string;
  outputFormats: string[];
  strengths: string[];
  weaknesses: string[];
  offlineCapable: boolean;
}

export interface SpecDiagnosticResult {
  canRunMeshy: boolean;
  meshyReason: string;
  canRunTripoSR: boolean;
  tripoSRReason: string;
  canRunTrellis: boolean;
  trellisReason: string;
  canRunHunyuan: boolean;
  hunyuanReason: string;
  canRunSlicer: boolean;
  slicerReason: string;
  overallRecommendation: string;
  tierDescription: string;
}
