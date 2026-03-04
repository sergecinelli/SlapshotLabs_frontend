import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';
import { PlayerService } from '../../../services/player.service';
import { GoalieService } from '../../../services/goalie.service';
import { TryoutService } from '../../../services/tryout.service';
import { TryoutEntry, TryoutTabType } from '../../interfaces/tryout.interface';
import { Player } from '../../interfaces/player.interface';
import { Goalie } from '../../interfaces/goalie.interface';
import { PositionService, PositionOption } from '../../../services/position.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';

export interface TryoutAddModalData {
  activeTab: TryoutTabType;
  teamId: number;
}

@Component({
  selector: 'app-tryout-add-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    ButtonComponent,
    ButtonSmallComponent,
    ButtonLoadingComponent,
  ],
  templateUrl: './tryout-add.modal.html',
  styleUrl: './tryout-add.modal.scss',
})
export class TryoutAddModal implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<TryoutAddModal>>(MatDialogRef);
  private playerService = inject(PlayerService);
  private goalieService = inject(GoalieService);
  private tryoutService = inject(TryoutService);
  private positionService = inject(PositionService);
  data = inject<TryoutAddModalData>(MAT_DIALOG_DATA);

  playerForm!: FormGroup;
  allEntries = signal<TryoutEntry[]>([]);
  selectedIds = signal<(string | number)[]>([]);
  searchText = signal('');
  showCreateForm = signal(false);
  isLoading = false;
  positionOptions: PositionOption[] = [];

  selectedEntries = computed(() => {
    const ids = new Set(this.selectedIds().map(String));
    return this.allEntries().filter((e) => ids.has(String(e.id)));
  });

  shootsOptions = [
    { value: 'Left Shot', label: 'Left Shot' },
    { value: 'Right Shot', label: 'Right Shot' },
  ];

  get isGoalie(): boolean {
    return this.data.activeTab === 'goalie';
  }

  ngOnInit(): void {
    this.playerForm = this.createForm();
    this.loadPositions();
    this.loadSearchData();
  }

  onSelectionChange(ids: (string | number)[]): void {
    this.selectedIds.set(ids);
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

  playerMatchesSearch(entry: TryoutEntry): boolean {
    const search = this.searchText().toLowerCase();
    if (!search) return true;
    return (
      entry.firstName.toLowerCase().includes(search) ||
      entry.lastName.toLowerCase().includes(search)
    );
  }

  removeEntry(entry: TryoutEntry): void {
    this.selectedIds.update((ids) => ids.filter((id) => String(id) !== String(entry.id)));
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  toggleCreateForm(): void {
    this.showCreateForm.set(!this.showCreateForm());
  }

  onSubmitSelected(): void {
    const entries = this.selectedEntries();
    if (!entries.length) return;

    this.isLoading = true;
    const requests = entries.map((entry) =>
      this.tryoutService.addToTryout(this.data.teamId, entry)
    );
    forkJoin(requests).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => {
        console.error('Failed to add to tryout:', error);
        this.isLoading = false;
      },
    });
  }

  onSubmitNew(): void {
    if (this.playerForm.valid) {
      const formValue = this.playerForm.value;
      const entry: Partial<TryoutEntry> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        position: this.isGoalie ? 'Goalie' : formValue.position,
        shoots: formValue.shoots,
        jerseyNumber: formValue.jerseyNumber,
        type: this.data.activeTab,
      };

      this.isLoading = true;
      this.tryoutService.addToTryout(this.data.teamId, entry).subscribe({
        next: () => this.dialogRef.close(true),
        error: (error) => {
          console.error('Failed to add to tryout:', error);
          this.isLoading = false;
        },
      });
    } else {
      Object.keys(this.playerForm.controls).forEach((key) => {
        this.playerForm.get(key)?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const control = this.playerForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  private loadSearchData(): void {
    if (this.isGoalie) {
      this.goalieService.getGoalies({ excludeDefault: true }).subscribe({
        next: (data) => this.allEntries.set(data.goalies.map((g) => this.goalieToEntry(g))),
        error: (error) => console.error('Failed to load goalies:', error),
      });
    } else {
      this.playerService.getPlayers().subscribe({
        next: (data) => this.allEntries.set(data.players.map((p) => this.playerToEntry(p))),
        error: (error) => console.error('Failed to load players:', error),
      });
    }
  }

  private playerToEntry(player: Player): TryoutEntry {
    return {
      id: player.id,
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      shoots: player.shoots,
      jerseyNumber: player.jerseyNumber,
      team: player.team,
      teamId: player.teamId,
      teamLogo: player.teamLogo,
      teamAgeGroup: player.teamAgeGroup,
      teamLevelName: player.teamLevelName,
      type: 'player',
    };
  }

  private goalieToEntry(goalie: Goalie): TryoutEntry {
    return {
      id: goalie.id,
      playerId: goalie.id,
      firstName: goalie.firstName,
      lastName: goalie.lastName,
      position: goalie.position,
      shoots: goalie.shoots,
      jerseyNumber: goalie.jerseyNumber,
      team: goalie.team,
      teamId: goalie.teamId,
      teamLevelName: goalie.level,
      type: 'goalie',
    };
  }

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      position: [''],
      shoots: [this.shootsOptions[0]?.value || ''],
      jerseyNumber: ['', [Validators.min(1), Validators.max(99)]],
      height: [''],
      weight: ['', [Validators.min(1)]],
      birthYear: ['', [Validators.min(1900), Validators.max(new Date().getFullYear())]],
    });
  }

  private loadPositions(): void {
    this.positionService.getPositions().subscribe({
      next: (positions) => {
        this.positionOptions = positions;
        if (positions.length > 0) {
          this.playerForm.patchValue({ position: positions[0].value });
        }
      },
      error: (error) => console.error('Failed to load positions:', error),
    });
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      position: 'Position',
      shoots: 'Shoots',
      jerseyNumber: 'Number',
      height: 'Height',
      weight: 'Weight',
      birthYear: 'Birth Year',
    };
    return labels[fieldName] || fieldName;
  }
}
