import {
  Type,
  Injector,
  Injectable,
  ApplicationRef,
  ComponentRef,
  EmbeddedViewRef,
  createComponent,
  EnvironmentInjector,
  inject,
  OnDestroy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ModalComponent } from '../shared/components/modal/modal.component';

export interface IModalParams {
  id?: string;
  name?: string;
  icon?: string;
  loading?: boolean;
  preventBackdropClose?: boolean;
  showClose?: boolean;
  data?: unknown;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  padding?: string;

  onClose?(data?: unknown): void;
  onBackdropClick?(data?: unknown): void;
  onCloseWithData?(data: unknown): void;
  onCloseWithDataProcessing?(data: unknown): void;
}

export enum ModalEvent {
  StopButtonLoading,
  StopHeaderLoading,
}

interface ModalInstance {
  id: string;
  ref: ComponentRef<ModalComponent>;
  params: IModalParams;
}

@Injectable({ providedIn: 'root' })
export class ModalService implements OnDestroy {
  private appRef = inject(ApplicationRef);
  private injector = inject(Injector);
  private environmentInjector = inject(EnvironmentInjector);

  modals: ModalInstance[] = [];
  private readonly animationDuration = 200;

  private isClosing = false;
  private isClosingAll = false;
  private _closingResolver?: () => void;
  private _closeAllResolver?: () => void;

  private readonly _onOpen = new Subject<{ id: string; name?: string }>();
  private readonly _onClose = new Subject<{ id: string; name?: string }>();
  private readonly _onEvent = new Subject<ModalEvent>();

  readonly onOpen$ = this._onOpen.asObservable();
  readonly onClose$ = this._onClose.asObservable();
  readonly onEvent$ = this._onEvent.asObservable();

  private escapeHandler: ((event: KeyboardEvent) => void) | null = null;

  get isAnyActive(): boolean {
    return this.modals.length > 0;
  }

  constructor() {
    this.setupGlobalEscapeHandler();
  }

  async openModal(component: Type<unknown>, params?: IModalParams): Promise<string> {
    if (this.isClosing || this.isClosingAll) await this.waitForClose();

    const id = params?.id ?? this.generateId(params?.name ?? 'modal');
    const ref = createComponent(ModalComponent, {
      environmentInjector: this.environmentInjector,
      elementInjector: this.injector,
    });

    ref.instance.content = component;
    ref.instance.params = { ...params, id };

    this.appRef.attachView(ref.hostView);

    document.body.appendChild((ref.hostView as EmbeddedViewRef<unknown>).rootNodes[0]);

    this.applyWindowStyles(ref, params);

    const instance: ModalInstance = { id, ref, params: { ...params, id } };
    this.modals.push(instance);

    this.subscribeToInstance(instance);
    this._onOpen.next({ id, name: params?.name });

    return id;
  }

  getModalData<T>(id?: string): T {
    const modal = id ? this.getModalById(id) : this.modals[this.modals.length - 1];
    return (modal?.params?.data ?? null) as T;
  }

  getTopModal(): { id: string; params: IModalParams } | undefined {
    const top = this.modals[this.modals.length - 1];
    return top ? { id: top.id, params: top.params } : undefined;
  }

  getModalById(id: string): ModalInstance | undefined {
    return this.modals.find((m) => m.params?.id === id);
  }

  broadcastEvent(event: ModalEvent): void {
    setTimeout(() => this._onEvent.next(event), 1);
  }

  updateModalParam<K extends keyof IModalParams>(
    key: K,
    value: IModalParams[K],
    id?: string
  ): void {
    const targets = id ? this.modals.filter((m) => m.params?.id === id) : this.modals.slice(-1);
    if (!targets.length) return;

    for (const modal of targets) {
      if (!modal.ref?.instance?.params) modal.ref.instance.params = {} as IModalParams;
      modal.ref.instance.params[key] = value;
    }
  }

  async closeModal(data?: unknown, id?: string): Promise<void> {
    if (this.isClosing || this.isClosingAll) {
      await this.waitForClose();
      return;
    }

    const targets = id ? this.modals.filter((m) => m.params?.id === id) : this.modals.slice(-1);
    if (!targets.length) return;

    this.isClosing = true;

    for (const t of targets) {
      try {
        t.ref.instance.close(data);
      } catch {
        /* noop */
      }
    }

    await new Promise<void>((r) => setTimeout(r, this.animationDuration));

    for (const t of targets) {
      try {
        this.destroyModals(t, 'onClose', data);
      } catch {
        /* noop */
      }
    }

    this.isClosing = false;
    this._closingResolver?.();
  }

  async closeAll(): Promise<void> {
    if (this.isClosingAll) {
      await this.waitForCloseAll();
      return;
    }
    if (!this.modals.length) return;

    this.isClosingAll = true;
    const closing = [...this.modals];

    closing.forEach((m) => m.ref.instance.close());
    await new Promise<void>((r) => setTimeout(r, this.animationDuration));

    closing.forEach((m) => {
      try {
        this.destroyModals(m, 'onClose');
      } catch {
        /* noop */
      }
    });

    this.isClosingAll = false;
    this._closeAllResolver?.();
  }

  closeWithData(data?: unknown, id?: string): void {
    const targets = this.findTarget(id);
    if (targets.length) this.destroyModals(targets, 'onCloseWithData', data);
  }

  closeWithDataProcessing(data?: unknown, id?: string): void {
    const targets = this.findTarget(id);
    targets.forEach((t) => t?.params.onCloseWithDataProcessing?.(data));
  }

  clickBackdrop(data?: unknown, id?: string): void {
    const targets = id ? this.modals.filter((m) => m.params?.id === id) : this.modals.slice(-1);
    if (!targets.length) return;

    for (const t of targets) {
      this.invokeCallback(t, 'onBackdropClick', data);
      try {
        t.ref.instance.close(data);
      } catch {
        /* noop */
      }
      setTimeout(() => this.destroyModals(t, 'onClose', data), this.animationDuration);
    }
  }

  ngOnDestroy(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler, true);
    }
  }

  private setupGlobalEscapeHandler(): void {
    this.escapeHandler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !this.modals.length) return;

      event.preventDefault();
      event.stopPropagation();

      const top = this.modals[this.modals.length - 1];
      if (top && !top.params?.preventBackdropClose) {
        top.ref.instance.close();
      }
    };

    document.addEventListener('keydown', this.escapeHandler, true);
  }

  private subscribeToInstance(instance: ModalInstance): void {
    const { ref } = instance;

    ref.instance.closed.subscribe((d) => this.destroyModals(instance, 'onClose', d));
    ref.instance.closedWithData.subscribe((d) =>
      this.destroyModals(instance, 'onCloseWithData', d)
    );
    ref.instance.closedWithDataProcessing.subscribe((d) =>
      this.invokeCallback(instance, 'onCloseWithDataProcessing', d)
    );
    ref.instance.backdropClicked.subscribe((d) => {
      this.invokeCallback(instance, 'onBackdropClick', d);
      this.destroyModals(instance, 'onClose', d);
    });
  }

  private destroyModals(
    instances: ModalInstance | ModalInstance[],
    event: keyof IModalParams,
    data?: unknown
  ): void {
    const arr = Array.isArray(instances) ? instances : [instances];

    for (const m of arr) {
      const { ref, params } = m;
      this.invokeCallback(m, event, data);

      try {
        this.appRef.detachView(ref.hostView);
        ref.destroy();
      } catch (err) {
        console.warn(`[ModalService] destroy failed for "${params?.name}"`, err);
      }

      this.modals = this.modals.filter((x) => x.ref !== ref);
      this._onClose.next({ id: m.id, name: params?.name });
    }
  }

  private applyWindowStyles(ref: ComponentRef<ModalComponent>, params?: IModalParams): void {
    const host = (ref.hostView as EmbeddedViewRef<unknown>).rootNodes[0] as HTMLElement;
    const el = host.querySelector('#modal-window') as HTMLElement | null;
    if (!el || !params) return;

    if (params.minWidth) el.style.minWidth = params.minWidth;
    if (params.maxWidth) el.style.maxWidth = params.maxWidth;
    if (params.width) el.style.width = params.width;
    if (params.padding !== undefined) el.style.padding = params.padding;
  }

  private invokeCallback(instance: ModalInstance, fn: keyof IModalParams, data?: unknown): void {
    const cb = instance.params?.[fn];
    if (typeof cb === 'function') cb(data);
  }

  private findTarget(id?: string): ModalInstance[] {
    return id ? this.modals.filter((m) => m.params?.id === id) : this.modals.slice(-1);
  }

  private async waitForClose(): Promise<void> {
    if (!this.isClosing) return;
    await new Promise<void>((r) => (this._closingResolver = r));
  }

  private async waitForCloseAll(): Promise<void> {
    if (!this.isClosingAll) return;
    await new Promise<void>((r) => (this._closeAllResolver = r));
  }

  private generateId(base: string): string {
    return `${base}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  }
}
