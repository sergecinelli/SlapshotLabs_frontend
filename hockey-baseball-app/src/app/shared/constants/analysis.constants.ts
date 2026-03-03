import { AnalysisType } from '../interfaces/analysis.interface';

export interface AnalysisTab {
  key: AnalysisType;
  label: string;
  icon: string;
}

export const ANALYSIS_TABS: AnalysisTab[] = [
  { key: 'team', label: 'Teams', icon: 'groups' },
  { key: 'player', label: 'Players', icon: 'person' },
  { key: 'goalie', label: 'Goalies', icon: 'shield' },
  { key: 'game', label: 'Games', icon: 'scoreboard' },
];

export interface AnalysisTypeConfig {
  buttonLabel: string;
  buttonIcon: string;
}

export const ANALYSIS_TYPE_CONFIG: Record<AnalysisType, AnalysisTypeConfig> = {
  team: { buttonLabel: 'Create Team Analysis', buttonIcon: 'add' },
  player: { buttonLabel: 'Create Player Analysis', buttonIcon: 'add' },
  goalie: { buttonLabel: 'Create Goalie Analysis', buttonIcon: 'add' },
  game: { buttonLabel: 'Create Game Analysis', buttonIcon: 'add' },
};
