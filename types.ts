export interface Protein {
  id: string;
  name: string;
  rcsbId: string; // 'RCSB ID'
  pubmedId: number; // 'Pubmed ID'
  title: string; // 'Title'
  pubmedAbstract: string; // 'PubMed Abstract'
  method: string; // 'Experimental Method'
  lengthA: number; // 'Length A'
  lengthB: number; // 'Length B'
  lengthC: number; // 'Length C'
  ligandName: string; // 'Ligand Name'
  ligandFormula: string; // 'Ligand Formula'
  ligandInchi: string; // 'Ligand Inchi'
  uniprotId: string; // 'UniProt ID'
  organism: string; // 'Source Organism'
  moleculeType: string; // 'Molecule'
  polyType: string; // 'Poly Type'
  polyRcsbEntityPolymerType: string; // 'Poly rcsb entity polymer type'
  polyPdbxSequenceOneLetterCode: string; // 'Poly pdbx sequence one letter code'
  sequenceLength: number; // 'poly_rcsb_sample_sequence_length'
  mutations: number; // 'mutation'
  chain: string;
  numChain: number;
  depositionDate: string; // 'relese_date'
}

export interface Ligand {
  id:string;
  name: string;
  smiles: string;
  formula: string;
  group?: string;
}

export interface LigandGroup {
  name: string;
  count: number;
}

export interface DockingResult {
  id: string;
  smiles: string;
  bindingEnergy: number;
  rmsd: number;
  energyModes: number[];
}

export enum NotificationType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface NotificationMessage {
  id: number;
  message: string;
  type: NotificationType;
}

export type View = 'dashboard' | 'docker' | 'ml-builder' | 'ml-predictor';

export enum DockingStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export interface DockingRun {
  id: string;
  name: string;
  description: string;
  proteinName: string;
  ligandCount: number;
  dockingType: 'blind' | 'targeted';
  createdAt: string;
  createdBy: string;
  status: DockingStatus;
  duration?: number; // in seconds
  // Optional detailed parameters for view page
  exhaustiveness?: number;
  numModes?: number;
  center_x?: number;
  center_y?: number;
  center_z?: number;
}

export enum TrainingStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export interface TrainingRun {
  id: string;
  name: string;
  datasetName: string;
  taskType: 'Prediction' | 'Classification';
  createdAt: string;
  createdBy: string;
  status: TrainingStatus;
  duration?: number; // in seconds
  modelCount: number; // Number of algorithms compared
}

export enum PredictionStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export interface PredictionRun {
  id: string;
  name: string;
  description: string;
  modelName: string; // Name of the saved model used
  modelId: string;
  modelType: string;
  modelBuilderName: string;
  inputCount: number; // Number of SMILES strings
  createdAt: string;
  createdBy: string;
  status: PredictionStatus;
  duration?: number; // in seconds
}

export interface SavedModel {
  id: string;
  name: string;
  modelType: string;
  description: string;
  performance: number;
  taskType: 'Prediction' | 'Classification';
  date: string;
  buildTime: number; // in seconds
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Should be hashed in a real app
  additionalInfo: string;
  photoUrl: string;
  status: UserStatus;
  role: UserRole;
}