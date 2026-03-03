export type AnalysisType = 'player' | 'goalie' | 'team' | 'game';

export interface Analysis extends Record<string, unknown> {
  id: string;
  type: AnalysisType;
  entityId: number;
  entityName: string;
  analysisBy: string;
  analysisText: string;
  date: string;
  time: string;
  createdAt: Date;
}

export interface AnalysisApiOut {
  id: number;
  type: AnalysisType;
  entity_id: number;
  entity_name: string;
  analysis_by: string;
  analysis_text: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisApiIn {
  type: AnalysisType;
  entity_id: number;
  analysis_by: string;
  analysis_text: string;
}

export interface AnalysisTableData {
  analyses: Analysis[];
  total: number;
}
