import type {
  User, Protein, Ligand, SavedModel, DockingRun, NotificationMessage, View, UserRole, LigandGroup,
  TrainingRun, PredictionRun, CompoundGenRun, SynthesisReport
} from '../types';
import { UserStatus } from '../types';

type SetStateAction<T> = T | ((prevState: T) => T);

export interface AppState {
  currentUser: User | null;
  currentView: View;
  notifications: NotificationMessage[];
  isProfileModalOpen: boolean;
  isCreateUserModalOpen: boolean;
  isChatOpen: boolean;
  proteins: Protein[];
  ligands: Ligand[];
  ligandGroups: LigandGroup[];
  savedModels: SavedModel[];
  dockingRuns: DockingRun[];
  trainingRuns: TrainingRun[];
  predictionRuns: PredictionRun[];
  compoundGenRuns: CompoundGenRun[];
  synthesisReports: SynthesisReport[];
  users: User[];
  selectedProtein: Protein | null;
  selectedLigands: Ligand[];
  isLoading: boolean;
  loadingCount: number;
}

export type Action =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'OPEN_PROFILE_MODAL' }
  | { type: 'CLOSE_PROFILE_MODAL' }
  | { type: 'OPEN_CREATE_USER_MODAL' }
  | { type: 'CLOSE_CREATE_USER_MODAL' }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationMessage }
  | { type: 'REMOVE_NOTIFICATION'; payload: number }
  | { type: 'CREATE_USER'; payload: User }
  | { type: 'VERIFY_USER'; payload: string }
  | { type: 'CHANGE_USER_ROLE'; payload: { userId: string; role: UserRole } }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'ADD_PROTEIN'; payload: Protein }
  | { type: 'SET_PROTEINS'; payload: Protein[] }
  | { type: 'SET_SELECTED_PROTEIN'; payload: Protein | null }
  | { type: 'SET_SELECTED_LIGANDS'; payload: SetStateAction<Ligand[]> }
  | { type: 'UPLOAD_LIGAND_GROUP'; payload: { ligands: Ligand[] } }
  | { type: 'CREATE_LIGAND_GROUP'; payload: { groupName: string; ligandIds: string[] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_WORKFLOW_STATE' }
  | { type: 'SET_LIGANDS', payload: Ligand[] }
  | { type: 'SET_LIGAND_GROUPS', payload: LigandGroup[] }
  | { type: 'SET_USERS', payload: User[] }
  | { type: 'SET_SAVED_MODELS', payload: SavedModel[] }
  | { type: 'ADD_SAVED_MODEL', payload: SavedModel }
  | { type: 'SET_DOCKING_RUNS', payload: DockingRun[] }
  | { type: 'SET_TRAINING_RUNS', payload: TrainingRun[] }
  | { type: 'ADD_TRAINING_RUN', payload: TrainingRun }
  | { type: 'SET_PREDICTION_RUNS', payload: PredictionRun[] }
  | { type: 'ADD_PREDICTION_RUN', payload: PredictionRun }
  | { type: 'SET_COMPOUND_GEN_RUNS'; payload: CompoundGenRun[] }
  | { type: 'DELETE_COMPOUND_GEN_RUN'; payload: string }
  | { type: 'SET_SYNTHESIS_REPORTS'; payload: SynthesisReport[] }
  | { type: 'DELETE_SYNTHESIS_REPORT'; payload: string };

export const initialState: AppState = {
  currentUser: null,
  currentView: 'dashboard',
  notifications: [],
  isProfileModalOpen: false,
  isCreateUserModalOpen: false,
  isChatOpen: false,
  proteins: [],
  ligands: [],
  ligandGroups: [],
  savedModels: [],
  dockingRuns: [],
  trainingRuns: [],
  predictionRuns: [],
  compoundGenRuns: [],
  synthesisReports: [],
  users: [],
  selectedProtein: null,
  selectedLigands: [],
  isLoading: false,
  loadingCount: 0,
};

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload, currentView: 'dashboard' };
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { ...initialState };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'OPEN_PROFILE_MODAL':
      return { ...state, isProfileModalOpen: true };
    case 'CLOSE_PROFILE_MODAL':
      return { ...state, isProfileModalOpen: false };
    case 'OPEN_CREATE_USER_MODAL':
      return { ...state, isCreateUserModalOpen: true };
    case 'CLOSE_CREATE_USER_MODAL':
      return { ...state, isCreateUserModalOpen: false };
    case 'TOGGLE_CHAT':
      return { ...state, isChatOpen: !state.isChatOpen };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'CREATE_USER':
      return { ...state, users: [action.payload, ...state.users] };
    case 'VERIFY_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload ? { ...user, status: UserStatus.VERIFIED } : user
        ),
      };
    case 'CHANGE_USER_ROLE':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.userId ? { ...user, role: action.payload.role } : user
        ),
      };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload)
      };
    case 'ADD_PROTEIN':
      return {
        ...state,
        proteins: [action.payload, ...state.proteins],
        selectedProtein: action.payload,
      };
    case 'SET_PROTEINS':
      {
        const newProteins = action.payload;
        const currentSelectedId = state.selectedProtein?.id;
        const newSelectedProtein = newProteins.find(p => p.id === currentSelectedId) || newProteins[0] || null;
        return {
          ...state,
          proteins: newProteins,
          selectedProtein: newSelectedProtein
        };
      }
    case 'SET_SELECTED_PROTEIN':
      return { ...state, selectedProtein: action.payload };
    case 'SET_SELECTED_LIGANDS':
      {
        const newSelectedLigands = typeof action.payload === 'function'
          ? action.payload(state.selectedLigands)
          : action.payload;
        return { ...state, selectedLigands: newSelectedLigands };
      }
    case 'UPLOAD_LIGAND_GROUP':
      {
        const existingLigandIds = new Set(state.ligands.map(l => l.id));
        const newUniqueLigands = action.payload.ligands.filter(l => !existingLigandIds.has(l.id));
        return { ...state, ligands: [...state.ligands, ...newUniqueLigands] };
      }
    case 'CREATE_LIGAND_GROUP':
      {
        const selectedLigandIds = new Set(action.payload.ligandIds);
        return {
          ...state,
          ligands: state.ligands.map(ligand =>
            selectedLigandIds.has(ligand.id)
              ? { ...ligand, group: action.payload.groupName }
              : ligand
          ),
          selectedLigands: []
        };
      }
    case 'SET_LOADING':
      if (action.payload) {
        const nextCount = state.loadingCount + 1;
        return { ...state, loadingCount: nextCount, isLoading: true };
      }
      {
        const nextCount = Math.max(0, state.loadingCount - 1);
        return { ...state, loadingCount: nextCount, isLoading: nextCount > 0 };
      }
    case 'RESET_WORKFLOW_STATE':
      return {
        ...state,
        selectedProtein: state.proteins.length > 0 ? state.proteins[0] : null,
        selectedLigands: [],
      };
    case 'SET_LIGANDS':
      return { ...state, ligands: action.payload };
    case 'SET_LIGAND_GROUPS':
      return { ...state, ligandGroups: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_SAVED_MODELS':
      return { ...state, savedModels: action.payload };
    case 'ADD_SAVED_MODEL':
      return { ...state, savedModels: [action.payload, ...state.savedModels] };
    case 'SET_DOCKING_RUNS':
      return { ...state, dockingRuns: action.payload };
    case 'SET_TRAINING_RUNS':
      return { ...state, trainingRuns: action.payload };
    case 'ADD_TRAINING_RUN':
      return { ...state, trainingRuns: [action.payload, ...state.trainingRuns] };
    case 'SET_PREDICTION_RUNS':
      return { ...state, predictionRuns: action.payload };
    case 'ADD_PREDICTION_RUN':
      return { ...state, predictionRuns: [action.payload, ...state.predictionRuns] };
    case 'SET_COMPOUND_GEN_RUNS':
      return { ...state, compoundGenRuns: action.payload };
    case 'DELETE_COMPOUND_GEN_RUN':
      return { ...state, compoundGenRuns: state.compoundGenRuns.filter(r => r.id !== action.payload) };
    case 'SET_SYNTHESIS_REPORTS':
      return { ...state, synthesisReports: action.payload };
    case 'DELETE_SYNTHESIS_REPORT':
      return { ...state, synthesisReports: state.synthesisReports.filter(r => r.id !== action.payload) };
    default:
      return state;
  }
};
