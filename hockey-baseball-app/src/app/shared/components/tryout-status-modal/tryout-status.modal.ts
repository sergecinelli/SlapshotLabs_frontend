import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { RoleService } from '../../../services/roles/role.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { CardGridComponent } from '../card-grid/card-grid.component';
import { CardGridItemComponent } from '../card-grid/card-grid-item.component';
import { ListComponent, IListItem } from '../list/list.component';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import {
  TryoutEntry,
  TryoutStatus,
  TryoutStatusHistoryEntry,
} from '../../interfaces/tryout.interface';
import {
  STATUS_COLOR,
  STATUS_TOOLTIP_DELAY,
  getStatusStyle,
  getStatusIconStyle,
  getStatusIcon,
  getStatusTooltip,
} from '../../constants/statuses.constants';
import { statusAccessByRole } from './tryout-status.role-map';

export interface TryoutStatusModalData {
  entry: TryoutEntry;
  statusHistory: TryoutStatusHistoryEntry[];
}

export interface TryoutStatusModalResult {
  status: TryoutStatus;
  note: string;
}

const STATUS_OPTIONS = [TryoutStatus.TryingOut, TryoutStatus.MadeTeam, TryoutStatus.Cut].map(
  (status) => ({
    value: status,
    label: status as string,
    icon: STATUS_COLOR[status]?.icon ?? 'help',
  })
);

@Component({
  selector: 'app-tryout-status-modal',
  imports: [
    ReactiveFormsModule,
    MatTooltipModule,
    SectionHeaderComponent,
    FormFieldComponent,
    CardGridComponent,
    CardGridItemComponent,
    ListComponent,
    ButtonComponent,
    ButtonLoadingComponent,
  ],
  templateUrl: './tryout-status.modal.html',
  styleUrl: './tryout-status.modal.scss',
})
export class TryoutStatusModal implements OnInit {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private roleService = inject(RoleService);
  data = inject(ModalService).getModalData<TryoutStatusModalData>();

  readonly tooltipDelay = STATUS_TOOLTIP_DELAY;

  statusForm!: FormGroup;
  isSubmitting = signal(false);
  selectedStatus = signal<TryoutStatus | null>(null);
  isFormDirty = signal(false);

  statusHistory = signal<TryoutStatusHistoryEntry[]>([]);

  playerListItem = computed<IListItem[]>(() => {
    const entry = this.data.entry;
    return [
      {
        key: 'player',
        name: `${entry.firstName} ${entry.lastName}`,
        description: entry.team || 'No team assigned',
        data: entry,
      },
    ];
  });

  playerInitials = computed<string>(() => {
    const entry = this.data.entry;
    const first = entry.firstName?.[0] || '';
    const last = entry.lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  });

  playerProfileRoute = computed<string>(() => {
    const entry = this.data.entry;
    const basePath =
      entry.type === 'goalie' ? '/teams-and-rosters/goalies/' : '/teams-and-rosters/players/';
    return basePath + entry.playerId + '/profile';
  });

  teamProfileRoute = computed<string | null>(() => {
    const entry = this.data.entry;
    return entry.teamId ? `/teams-and-rosters/teams/${entry.teamId}/profile` : null;
  });

  historyListItems = computed<IListItem[]>(() => {
    const datePipe = new DatePipe('en-US');
    const history = this.statusHistory();
    return history.map((entry, index) => {
      const userName = entry.user ? `${entry.user.first_name} ${entry.user.last_name}`.trim() : '';
      const byLine = userName ? `by ${userName}` : '';
      const noteLine = entry.note || '';
      const description = [byLine, noteLine].filter(Boolean).join('. ');

      return {
        key: index,
        name: entry.status,
        description: description || undefined,
        value: entry.date_time ? datePipe.transform(entry.date_time, 'MMM d, y h:mm a') || '' : '',
        data: { ...entry, isLatest: index === history.length - 1 },
      };
    });
  });

  availableStatuses = computed(() => {
    const role = this.roleService.current;
    const allowed = statusAccessByRole[role] ?? [];
    return STATUS_OPTIONS.filter((s) => allowed.includes(s.value));
  });

  canSubmit = computed(() => {
    const selected = this.selectedStatus();
    if (selected === null) return false;
    if (selected !== this.data.entry.status) return true;
    return this.isFormDirty();
  });

  constructor() {
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.statusForm = this.fb.group({
      note: [''],
    });

    this.statusForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.isFormDirty.set(!!value.note?.trim());
    });

    this.statusHistory.set(this.data.statusHistory || []);

    this.modalService.registerDirtyCheck(
      () => this.selectedStatus() !== null || this.statusForm.dirty
    );
  }

  goToPlayer(event: MouseEvent): void {
    event.preventDefault();
    this.modalService.closeAll();
    this.router.navigate([this.playerProfileRoute()]);
  }

  goToTeam(event: MouseEvent): void {
    event.preventDefault();
    const route = this.teamProfileRoute();
    if (!route) return;
    this.modalService.closeAll();
    this.router.navigate([route]);
  }

  onStatusSelect(status: TryoutStatus): void {
    this.selectedStatus.set(status);
  }

  getStatusStyle = getStatusStyle;
  getStatusIconStyle = getStatusIconStyle;
  getStatusIcon = getStatusIcon;
  getStatusTooltip = getStatusTooltip;

  onSubmit(): void {
    const status = this.selectedStatus();
    if (!status) return;

    this.isSubmitting.set(true);
    const result: TryoutStatusModalResult = {
      status,
      note: this.statusForm.value.note || '',
    };
    this.modalService.closeWithDataProcessing(result);
  }

  onCancel(): void {
    this.modalService.closeModal();
  }
}
