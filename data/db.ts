

import { Protein, Ligand, SavedModel, DockingRun, User, UserStatus, UserRole } from '../types';

export const ligands: Ligand[] = [
  { id: 'l1', name: 'Ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', formula: 'C13H18O2', group: 'NSAIDs' },
  { id: 'l2', name: 'Aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', formula: 'C9H8O4', group: 'NSAIDs' },
  { id: 'l3', name: 'Paracetamol', smiles: 'CC(=O)NC1=CC=C(C=C1)O', formula: 'C8H9NO2', group: 'Analgesics' },
  { id: 'l4', name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', formula: 'C8H10N4O2', group: 'Stimulants' },
  { id: 'l5', name: 'Metformin', smiles: 'CN(C)C(=N)N=C(N)N', formula: 'C4H11N5', group: 'Antidiabetic' },
];


export const savedModels: SavedModel[] = [
  {
    id: 'm1',
    name: 'pIC50 Prediction Model',
    modelType: 'XGBoost',
    description: 'Initial model for pIC50 prediction on the public ChEMBL dataset. This model was trained with a specific subset of inhibitors and shows high correlation for compounds with a molecular weight under 500 Da.',
    performance: 0.93,
    taskType: 'Prediction',
    date: '2023-10-26',
    buildTime: 320, // seconds
  },
  {
    id: 'm2',
    name: 'Activity Classifier v2',
    modelType: 'Random Forest',
    description: 'Classifier for active/inactive compounds based on internal HTS data. Tuned hyperparameters using grid search. The threshold for activity was set at a pIC50 of 6.5.',
    performance: 0.95,
    taskType: 'Classification',
    date: '2023-10-25',
    buildTime: 450,
  },
  {
    id: 'm3',
    name: 'Solubility Predictor (SVM)',
    modelType: 'SVM',
    description: 'Support Vector Machine for predicting aqueous solubility. Uses Morgan fingerprints with a radius of 2 and 2048 bits.',
    performance: 0.85,
    taskType: 'Prediction',
    date: '2023-10-22',
    buildTime: 210,
  },
    {
    id: 'm4',
    name: 'ADMET Toxicity Model',
    modelType: 'Neural Network',
    description: 'Deep neural network (3 hidden layers) to classify compounds for potential hERG channel toxicity.',
    performance: 0.88,
    taskType: 'Classification',
    date: '2023-10-20',
    buildTime: 600,
  },
];

export const dockingRuns: DockingRun[] = Array.from({ length: 50 }, (_, i) => ({
  id: `dr${i}`,
  duration: 60 + Math.floor(Math.random() * 240), // 1 to 5 minutes
  date: `2023-10-${Math.floor(Math.random() * 28) + 1}`,
  ligandCount: Math.floor(Math.random() * 20) + 1,
}));

export const users: User[] = [
  {
    id: 'user-admin',
    name: 'Dr. Evelyn Reed',
    email: 'admin@quantcure.ai',
    password: 'password',
    additionalInfo: 'Lead Scientist, focusing on computational drug discovery and AI-driven molecular modeling.',
    photoUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    status: UserStatus.VERIFIED,
    role: UserRole.ADMIN,
  },
  {
    id: 'user-standard',
    name: 'John Doe',
    email: 'user@quantcure.ai',
    password: 'password',
    additionalInfo: 'Research associate.',
    photoUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026705d',
    status: UserStatus.VERIFIED,
    role: UserRole.USER,
  },
  {
    id: 'user-pending',
    name: 'Jane Smith',
    email: 'pending@quantcure.ai',
    password: 'password',
    additionalInfo: 'New hire, waiting for account verification.',
    photoUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026706d',
    status: UserStatus.PENDING,
    role: UserRole.USER,
  },
];
