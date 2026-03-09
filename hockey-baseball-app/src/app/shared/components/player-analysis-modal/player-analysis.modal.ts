import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { Player } from '../../interfaces/player.interface';
import { Analysis, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CustomSelectComponent, SelectOptionGroup } from '../custom-select/custom-select.component';
import { getFieldError } from '../../validators/form-error.util';

export interface PlayerAnalysisModalData {
  analysis?: Analysis;
  isEditMode: boolean;
  preSelectedPlayerId?: string;
  players: Player[];
}

@Component({
  selector: 'app-player-analysis-modal',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    ButtonLoadingComponent,
    SectionHeaderComponent,
    FormFieldComponent,
    CustomSelectComponent,
  ],
  templateUrl: './player-analysis.modal.html',
  styleUrl: './player-analysis.modal.scss',
})
export class PlayerAnalysisModal {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  data = inject(ModalService).getModalData<PlayerAnalysisModalData>();

  analysisForm: FormGroup;
  isEditMode: boolean;
  isSubmitting = signal(false);

  allPlayers = signal<Player[]>([]);
  selectedEntityId = signal('');

  playerOptionGroups = computed<SelectOptionGroup[]>(() => {
    const players = this.allPlayers();
    const groups = new Map<string, Player[]>();
    for (const player of players) {
      const key = player.team || 'Unknown Team';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(player);
    }
    return Array.from(groups, ([teamName, entries]) => ({
      label: teamName,
      options: entries.map((p) => ({
        value: p.id,
        label: `${p.firstName} ${p.lastName}`,
        prefix: `#${p.jerseyNumber}`,
      })),
    }));
  });

  isEntityLocked = computed(() => !!this.data.preSelectedPlayerId || this.isEditMode);

  selectedPlayerLabel = computed(() => {
    const entityId = this.selectedEntityId();
    if (!entityId) return '';
    const player = this.allPlayers().find((p) => p.id === entityId);
    return player ? `${player.firstName} ${player.lastName}` : '';
  });

  constructor() {
    this.isEditMode = this.data.isEditMode;
    this.allPlayers.set(this.data.players);

    this.analysisForm = this.fb.group({
      entityId: ['', [Validators.required]],
      title: ['', [Validators.required]],
      author: ['', [Validators.required]],
      analysis: ['', [Validators.required]],
    });

    this.analysisForm
      .get('entityId')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value: string) => this.selectedEntityId.set(value));

    this.modalService.registerDirtyCheck(() => this.analysisForm.dirty);
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });

    this.patchFormValues();
  }

  onSubmit(): void {
    if (this.analysisForm.invalid) {
      Object.keys(this.analysisForm.controls).forEach((key) => {
        this.analysisForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.analysisForm.value;
    const apiData: AnalyticsApiIn = {
      author: formValue.author,
      title: formValue.title,
      analysis: formValue.analysis,
      player_id: parseInt(formValue.entityId, 10),
    };

    this.modalService.closeWithDataProcessing({
      isEditMode: this.isEditMode,
      analysisId: this.data.analysis?.id,
      apiData,
    });
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private readonly fieldLabels: Record<string, string> = {
    entityId: 'Player',
    title: 'Title',
    author: 'Author',
    analysis: 'Analysis',
  };

  getErrorMessage(fieldName: string): string {
    return getFieldError(
      this.analysisForm.get(fieldName),
      this.fieldLabels[fieldName] || fieldName
    );
  }

  private patchFormValues(): void {
    if (this.isEditMode && this.data.analysis) {
      this.analysisForm.patchValue({
        entityId: String(this.data.analysis.entityId),
        title: this.data.analysis.title,
        author: this.data.analysis.author,
        analysis: this.data.analysis.analysis,
      });
    } else if (this.data.preSelectedPlayerId) {
      this.analysisForm.patchValue({ entityId: this.data.preSelectedPlayerId });
    }
  }
}
