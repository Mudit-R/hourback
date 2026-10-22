import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AppTab = 'comments' | 'gradebook' | 'portfolios' | 'reportcards' | 'analytics';

interface UIState {
  selectedStudentId: string | null;
  selectedClassId: string | null;
  selectedPeriodId: string | null;
  activeJobId: string | null;
  sidebarOpen: boolean;
  activeTab: AppTab;
  aiAssistantOpen: boolean;
}

const initialState: UIState = {
  selectedStudentId: null,
  selectedClassId: null,
  selectedPeriodId: null,
  activeJobId: null,
  sidebarOpen: false,
  activeTab: 'comments',
  aiAssistantOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectStudent: (state, action: PayloadAction<string | null>) => {
      state.selectedStudentId = action.payload;
    },
    selectClass: (state, action: PayloadAction<{ classId: string; periodId: string }>) => {
      state.selectedClassId = action.payload.classId;
      state.selectedPeriodId = action.payload.periodId;
      state.selectedStudentId = null;
    },
    setActiveJob: (state, action: PayloadAction<string | null>) => {
      state.activeJobId = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<AppTab>) => {
      state.activeTab = action.payload;
    },
    setAiAssistantOpen: (state, action: PayloadAction<boolean>) => {
      state.aiAssistantOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const {
  selectStudent,
  selectClass,
  setActiveJob,
  setActiveTab,
  setAiAssistantOpen,
  toggleSidebar,
} = uiSlice.actions;
export default uiSlice.reducer;
