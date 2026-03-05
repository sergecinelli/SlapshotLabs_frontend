import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { Player } from '../../interfaces/player.interface';
import { Analysis, AnalyticsApiIn } from '../../interfaces/analysis.interface';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';

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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    ButtonComponent,
    ButtonLoadingComponent,
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
  searchText = signal('');
  selectedEntityId = signal('');

  groupedPlayers = computed(() => {
    const players = this.allPlayers();
    const search = this.searchText().toLowerCase();
    const groups = new Map<string, Player[]>();
    for (const player of players) {
      if (search && !this.playerMatchesSearch(player, search)) continue;
      const key = player.team || 'Unknown Team';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(player);
    }
    return Array.from(groups, ([teamName, entries]) => ({ teamName, entries }));
  });

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

    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });

    this.patchFormValues();
  }

  onSelectOpenedChange(opened: boolean): void {
    if (!opened) {
      this.searchText.set('');
    }
  }

  onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchText.set('');
    input.value = '';
    input.focus();
  }

  isPlayerVisible(player: Player): boolean {
    return this.playerMatchesSearch(player, this.searchText().toLowerCase());
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

  getErrorMessage(fieldName: string): string {
    const control = this.analysisForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        const labels: Record<string, string> = {
          entityId: 'Player',
          title: 'Title',
          author: 'Author',
          analysis: 'Analysis',
        };
        return `${labels[fieldName] || fieldName} is required`;
      }
    }
    return '';
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

  private playerMatchesSearch(player: Player, search: string): boolean {
    if (!search) return true;
    return (
      player.firstName.toLowerCase().includes(search) ||
      player.lastName.toLowerCase().includes(search) ||
      String(player.jerseyNumber).includes(search)
    );
  }
}
