import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AnalysisService } from '../../services/analysis.service';
import { Analysis, AnalysisType } from '../../shared/interfaces/analysis.interface';
import { ANALYSIS_TABS, ANALYSIS_TYPE_CONFIG } from '../../shared/constants/analysis.constants';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import {
  TabsSliderComponent,
  TabItem,
} from '../../shared/components/tabs-slider/tabs-slider.component';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './analytics.role-map';
import { PlayerAnalysisModal } from '../../shared/components/player-analysis-modal/player-analysis.modal';
import { GoalieAnalysisModal } from '../../shared/components/goalie-analysis-modal/goalie-analysis.modal';
import { TeamAnalysisModal } from '../../shared/components/team-analysis-modal/team-analysis.modal';
import { GameAnalysisModal } from '../../shared/components/game-analysis-modal/game-analysis.modal';

@Component({
  selector: 'app-analytics',
  imports: [
    DataTableComponent,
    ButtonComponent,
    TabsSliderComponent,
    ComponentVisibilityByRoleDirective,
  ],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.scss',
})
export class AnalyticsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private dialog = inject(MatDialog);
  private analysisService = inject(AnalysisService);

  protected visibilityByRoleMap = visibilityByRoleMap;

  readonly tabItems: TabItem[] = ANALYSIS_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
  }));

  activeTab = signal<AnalysisType>('team');
  analyses = signal<Analysis[]>([]);
  loading = signal(true);
  showTabs = signal(true);

  activeTabIndex = computed(() => ANALYSIS_TABS.findIndex((tab) => tab.key === this.activeTab()));
  buttonConfig = computed(() => ANALYSIS_TYPE_CONFIG[this.activeTab()]);

  tableColumns: TableColumn[] = [
    { key: 'entityName', label: 'Name', sortable: true, width: '200px' },
    { key: 'analysisBy', label: 'Analysis By', sortable: true, width: '150px' },
    { key: 'analysisText', label: 'Analysis', sortable: false, width: '300px' },
    { key: 'date', label: 'Date', sortable: true, width: '120px' },
    { key: 'time', label: 'Time', sortable: false, width: '100px' },
  ];

  tableActions: TableAction[] = [
    {
      label: 'Edit',
      action: 'edit',
      variant: 'secondary',
      icon: 'stylus',
      roleVisibilityName: 'edit-action',
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'danger',
      icon: 'delete',
      roleVisibilityName: 'delete-action',
    },
  ];

  ngOnInit(): void {
    const defaultTab = this.route.snapshot.data['defaultTab'] as AnalysisType | undefined;
    const tabParam = this.route.snapshot.queryParams['tab'] as AnalysisType | undefined;
    const validTabs: AnalysisType[] = ['team', 'player', 'goalie', 'game'];
    const tab = validTabs.includes(defaultTab!)
      ? defaultTab!
      : validTabs.includes(tabParam!)
        ? tabParam!
        : 'team';

    this.showTabs.set(!defaultTab);
    this.activeTab.set(tab);
    this.loadAnalyses();
  }

  onTabChange(key: string): void {
    const tab = key as AnalysisType;
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.location.replaceState('/analytics', `tab=${tab}`);
    this.loadAnalyses();
  }

  onCreateAnalysis(): void {
    const dialogRef = this.openModal(this.activeTab(), { isEditMode: false });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAnalyses();
      }
    });
  }

  onTableAction(event: { action: string; item: Analysis }): void {
    switch (event.action) {
      case 'edit':
        this.onEditAnalysis(event.item);
        break;
      case 'delete':
        this.onDeleteAnalysis(event.item);
        break;
    }
  }

  private onEditAnalysis(analysis: Analysis): void {
    const dialogRef = this.openModal(analysis.type, { analysis, isEditMode: true });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadAnalyses();
      }
    });
  }

  private openModal(type: AnalysisType, data: Record<string, unknown>): MatDialogRef<unknown> {
    const config = { width: '600px', data };
    switch (type) {
      case 'player':
        return this.dialog.open(PlayerAnalysisModal, config);
      case 'goalie':
        return this.dialog.open(GoalieAnalysisModal, config);
      case 'team':
        return this.dialog.open(TeamAnalysisModal, config);
      case 'game':
        return this.dialog.open(GameAnalysisModal, config);
    }
  }

  private onDeleteAnalysis(analysis: Analysis): void {
    if (confirm('Are you sure you want to delete this analysis?')) {
      this.analysisService.deleteAnalysis(analysis.id).subscribe({
        next: () => this.loadAnalyses(),
        error: (error) => console.error('Failed to delete analysis:', error),
      });
    }
  }

  private loadAnalyses(): void {
    this.loading.set(true);

    this.analysisService.getAnalyses(this.activeTab()).subscribe({
      next: (result) => {
        this.analyses.set(result.analyses);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load analyses:', error);
        this.analyses.set([]);
        this.loading.set(false);
      },
    });
  }
}
