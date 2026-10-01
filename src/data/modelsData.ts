import { AiModelComparison, GpuOption } from '../types';

export const GPU_PRESETS: GpuOption[] = [
  { id: 'none-igpu', name: '内蔵GPU (Intel UHD / Iris Xe / AMD Radeon Vega)', vram: 0, type: 'intel', tier: 'none' },
  { id: 'apple-m', name: 'Apple Silicon (M1 / M2 / M3 / M4 統一メモリ 8~16GB)', vram: 8, type: 'apple', tier: 'mid' },
  { id: 'apple-m-pro', name: 'Apple Silicon (Pro / Max / Ultra 32GB+)', vram: 32, type: 'apple', tier: 'high' },
  { id: 'gtx-1660', name: 'NVIDIA GTX 1660 / 1650 (VRAM 4~6GB)', vram: 6, type: 'nvidia', tier: 'entry' },
  { id: 'rtx-3050', name: 'NVIDIA RTX 3050 / RTX 2060 (VRAM 6~8GB)', vram: 8, type: 'nvidia', tier: 'entry' },
  { id: 'rtx-3060-12g', name: 'NVIDIA RTX 3060 12GB (コスパ最強 VRAM 12GB)', vram: 12, type: 'nvidia', tier: 'mid' },
  { id: 'rtx-4060', name: 'NVIDIA RTX 4060 / 4060 Ti 8GB (VRAM 8GB)', vram: 8, type: 'nvidia', tier: 'mid' },
  { id: 'rtx-4060ti-16g', name: 'NVIDIA RTX 4060 Ti 16GB (VRAM 16GB)', vram: 16, type: 'nvidia', tier: 'mid' },
  { id: 'rtx-4070', name: 'NVIDIA RTX 4070 / 4070 SUPER (VRAM 12GB)', vram: 12, type: 'nvidia', tier: 'high' },
  { id: 'rtx-4070ti', name: 'NVIDIA RTX 4070 Ti / 4080 (VRAM 16GB)', vram: 16, type: 'nvidia', tier: 'high' },
  { id: 'rtx-3090', name: 'NVIDIA RTX 3090 / 4090 (VRAM 24GB ハイエンド)', vram: 24, type: 'nvidia', tier: 'ultra' },
  { id: 'amd-rx', name: 'AMD Radeon RX 6000 / 7000番台 (VRAM 12~16GB)', vram: 16, type: 'amd', tier: 'mid' },
];

export const AI_MODELS_DATA: AiModelComparison[] = [
  {
    id: 'meshy-3d-agent',
    name: 'Meshy 3D Agent (meshy-dev)',
    provider: 'Meshy Inc. (Cloud SaaS)',
    type: 'cloud',
    license: 'エージェント/CLIはMIT・APIは商用サービス',
    cost: '無料枠あり（月200クレジット等、超過後は有料課金）',
    minVram: 0,
    recommendedVram: 0,
    gpuRequirement: 'GPU不要 (クラウド処理のためノートPC・内蔵GPUで完全動作)',
    qualityScore: 9.2,
    printReadinessScore: 9.4,
    generationTime: '約1〜3分 (クラウドGPU)',
    outputFormats: ['STL', '3MF', 'OBJ', 'GLB', 'FBX', 'USDZ'],
    strengths: [
      'PCスペック不問（GPUなしの薄型ノートPCでもOK）',
      '3Dプリント用の水密性(Manifold)チェックやスケーリング、スライサー自動連携が強力',
      'テキスト/画像からの生成精度・テクスチャ・リトポロジーが非常に高品位',
      'Node.js 22+のCLI/Cursor/Claude Code等から直接コマンド対話操作可能'
    ],
    weaknesses: [
      '完全無料・無制限ではない（無料枠を使い切ると有料）',
      'インターネット常時接続が必須（オフライン不可）',
      '機密情報・社内非公開データをクラウドAPIに送る必要がある'
    ],
    offlineCapable: false,
  },
  {
    id: 'trellis',
    name: 'Microsoft TRELLIS',
    provider: 'Microsoft Research (オープンソース)',
    type: 'local',
    license: 'Apache 2.0 (オープンソース / 商用利用可)',
    cost: '完全無料 (電気代・PCハード代のみ)',
    minVram: 12,
    recommendedVram: 16,
    gpuRequirement: 'NVIDIA GPU必須 (VRAM 12GB〜16GB以上)',
    qualityScore: 9.4,
    printReadinessScore: 8.8,
    generationTime: '約20〜60秒 (RTX 4090時)',
    outputFormats: ['GLB', 'OBJ', 'PLY (Gaussian Splat)'],
    strengths: [
      'オープンソース界トップクラスの幾何形状クオリティ',
      '完全ローカル・無制限・完全無料・完全プライベート',
      '構造化された3D潜在表現（Structured 3D Latents）による繊細なディテール'
    ],
    weaknesses: [
      'NVIDIA製GPU（VRAM 12GB以上）がないとエラー落ちする',
      'Python/CUDA環境構築の難易度が高い（ComfyUIやGitHubリポジトリ）',
      '出力メッシュを3Dプリント用に水密化・穴埋めする後処理が必要な場合がある'
    ],
    offlineCapable: true,
  },
  {
    id: 'triposr',
    name: 'TripoSR',
    provider: 'Stability AI & Tripo (オープンソース)',
    type: 'local',
    license: 'MIT (商用利用可)',
    cost: '完全無料 (電気代・PCハード代のみ)',
    minVram: 6,
    recommendedVram: 8,
    gpuRequirement: 'NVIDIA GPU推奨 (VRAM 6GB〜8GBで動作、CPU実行も可能だが低速)',
    qualityScore: 7.8,
    printReadinessScore: 8.0,
    generationTime: '約0.5秒〜3秒 (超高速)',
    outputFormats: ['OBJ', 'GLB'],
    strengths: [
      '驚異的な生成速度（1秒未満〜数秒）',
      'VRAM 6GB〜8GB程度のエントリーGPU（RTX 3050やノートPC向けGPU）でも動く',
      'ComfyUIやウェブUIなど導入エコシステムが豊富'
    ],
    weaknesses: [
      '裏側や細部のテクスチャ・凹凸の解像度はやや粗い',
      '単一画像からのみ（テキストからの直接生成は別モデル併用が必要）'
    ],
    offlineCapable: true,
  },
  {
    id: 'hunyuan3d-2',
    name: 'Tencent Hunyuan3D 2.0',
    provider: 'Tencent (オープンソース)',
    type: 'local',
    license: 'Tencent Open License',
    cost: '完全無料 (ローカル環境)',
    minVram: 16,
    recommendedVram: 24,
    gpuRequirement: 'NVIDIA ハイエンドGPU (VRAM 16GB〜24GB)',
    qualityScore: 9.5,
    printReadinessScore: 8.9,
    generationTime: '約1〜4分 (ローカルGPU)',
    outputFormats: ['OBJ', 'GLB'],
    strengths: [
      '映画・ゲーム用アセット並みの超高精細メッシュ＆PBRテクスチャ',
      'テキスト及びマルチビュー画像からの高精度な造形'
    ],
    weaknesses: [
      'ハードルが極めて高い（RTX 3090/4090クラスの24GB VRAM推奨）',
      '生成に数分を要し、重い'
    ],
    offlineCapable: true,
  },
  {
    id: 'shap-e',
    name: 'OpenAI Shap-E',
    provider: 'OpenAI (オープンソース)',
    type: 'local',
    license: 'MIT',
    cost: '完全無料',
    minVram: 4,
    recommendedVram: 6,
    gpuRequirement: '低スペックGPU / CPUでも動作可能 (VRAM 4GB~)',
    qualityScore: 5.5,
    printReadinessScore: 5.0,
    generationTime: '約10〜30秒',
    outputFormats: ['OBJ', 'PLY'],
    strengths: [
      '古いPCやローエンドGPU、CPUオンリーでも辛うじて動く',
      '軽量でインストールが比較的容易'
    ],
    weaknesses: [
      '解像度がかなり低く、粘土細工のような形状になりやすい',
      '現代の3Dプリントフィギュア制作にはクオリティ不足'
    ],
    offlineCapable: true,
  }
];

export const CORE_ANSWERS = [
  {
    question: 'Q1. meshy-dev/meshy-3d-agent をローカルPCにインストールして3Dプリント用データを出力できますか？',
    answer: '「アプリ（CLIやエージェント操作環境）はローカルにインストールできますが、3Dモデル生成そのものはMeshyのクラウドサーバーで実行されます」。出力されるデータはSTLや3MFなど3Dプリントに適した形式で直接ローカルに保存でき、スライサー（Bambu Studio, Cura等）に自動で開くことも可能です。',
    badge: '部分的にYes (生成はクラウド / ツールはローカル)',
    badgeColor: 'blue'
  },
  {
    question: 'Q2. 無料で出力できますか？',
    answer: '「無制限の完全無料ではありません」。Meshyには無料アカウント登録で付与される無料クレジット（月間約200クレジット等のフリー枠）があり、その範囲内であれば無料でSTL/3MFファイルを出力・ダウンロード可能です。ただし無料枠を消費し切った後は、有料サブスクリプション（月額$16〜）またはクレジットパックの購入が必要となります。なお、ダウンロード済みの3Dモデルをローカルでスケーリングしたりスライサーで開く作業は完全無料（ノーコスト）です。',
    badge: '無料枠あり（上限あり / 超過後は有料）',
    badgeColor: 'amber'
  },
  {
    question: 'Q3. PCのスペック条件や必要なGPU環境はありますか？',
    answer: '「Meshy 3D Agentを使う場合、高性能なグラフィックボード(GPU)は一切不要です」。重たいAI計算はすべてクラウド上のGPUで行われるため、GPUを積んでいない普通のノートPCやIntel内蔵グラフィック、MacBook(M1〜M4)でもサクサク動きます。最低条件はNode.js 22.12以上が動くことと、出力された3Dモデルをスライサーソフト（Bambu Studio, OrcaSlicer, Cura等）で確認できる一般的なメモリ（8GB〜16GB推奨）があれば十分です。',
    badge: 'GPU不要 (クラウド処理のため軽量)',
    badgeColor: 'emerald'
  }
];
