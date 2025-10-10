import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerFormModal } from './player-form-modal';

describe('PlayerFormModal', () => {
  let component: PlayerFormModal;
  let fixture: ComponentFixture<PlayerFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
