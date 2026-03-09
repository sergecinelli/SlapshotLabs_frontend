import { trigger, transition, style, animate, query, group } from '@angular/animations';

const isAuth = (state: string) => state?.startsWith('auth');

export const routeTransition = trigger('routeTransition', [
  // Auth → App (login): auth zooms in + fades out, app grows from smaller
  transition(
    (from, to) => isAuth(from) && to === 'app',
    [
      query(':enter, :leave', style({ position: 'absolute', width: '100%', height: '100%' }), {
        optional: true,
      }),
      group([
        query(
          ':leave',
          [
            style({ opacity: 1, transform: 'scale(1)' }),
            animate('400ms ease-in', style({ opacity: 0, transform: 'scale(1.04)' })),
          ],
          { optional: true }
        ),
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'scale(0.96)' }),
            animate('400ms 200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
          ],
          { optional: true }
        ),
      ]),
    ]
  ),

  // App → Auth (logout): sign-in fades in on top, app just fades out (no scale)
  transition(
    (from, to) => from === 'app' && isAuth(to),
    [
      query(':enter, :leave', style({ position: 'absolute', width: '100%', height: '100%' }), {
        optional: true,
      }),
      group([
        query(':leave', [style({ zIndex: 0 }), animate('500ms ease-in', style({ opacity: 0 }))], {
          optional: true,
        }),
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'scale(1.05)', zIndex: 1 }),
            animate('500ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
          ],
          { optional: true }
        ),
      ]),
    ]
  ),

  // Auth ↔ Auth (between sign-in, sign-up, forgot-password, etc.): cross-fade content only
  transition(
    (from, to) => isAuth(from) && isAuth(to),
    [
      query(':enter, :leave', style({ position: 'absolute', width: '100%', height: '100%' }), {
        optional: true,
      }),
      // Hide entire entering component while leave animates
      query(':enter', style({ opacity: 0 }), { optional: true }),
      // Leave: form slides down and fades out (accelerate into exit)
      query(
        ':leave .form-column',
        [
          animate(
            '80ms cubic-bezier(0.4, 0, 1, 1)',
            style({ opacity: 0, transform: 'translateY(10px)' })
          ),
        ],
        { optional: true }
      ),
      // Show entering component, but keep hero hidden (it's identical to leave's hero)
      query(':enter', style({ opacity: 1 }), { optional: true }),
      query(':enter .hero-panel', style({ opacity: 0 }), { optional: true }),
      // Enter: form slides down from above with overshoot bounce
      query(
        ':enter .form-column',
        [
          style({ opacity: 0, transform: 'translateY(-10px)' }),
          animate(
            '120ms cubic-bezier(0.18, 0.89, 0.32, 1.6)',
            style({ opacity: 1, transform: 'translateY(0)' })
          ),
        ],
        { optional: true }
      ),
      // Reveal entering hero panel before leaving component is removed
      query(':enter .hero-panel', animate('0ms', style({ opacity: 1 })), { optional: true }),
    ]
  ),
]);
