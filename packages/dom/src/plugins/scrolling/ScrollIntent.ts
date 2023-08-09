import {batch, effect, signal, type Signal} from '@dnd-kit/state';
import {Plugin} from '@dnd-kit/abstract';
import {Axes} from '@dnd-kit/geometry';
import type {Coordinates} from '@dnd-kit/geometry';
import {ScrollDirection} from '@dnd-kit/dom-utilities';

import type {DragDropManager} from '../../manager';

import {ScrollLock} from './ScrollLock';

const DIRECTIONS = [ScrollDirection.Forward, ScrollDirection.Reverse];

class ScrollIntent {
  public x = new ScrollLock();
  public y = new ScrollLock();

  public isLocked(): boolean {
    return this.x.isLocked() && this.y.isLocked();
  }
}

export class ScrollIntentTracker extends Plugin<DragDropManager> {
  private signal: Signal<ScrollIntent | null>;

  constructor(manager: DragDropManager) {
    super(manager);

    const scrollIntent = signal<ScrollIntent | null>(null);
    let previousDelta: Coordinates | null = null;

    this.signal = scrollIntent;

    effect(() => {
      const {position} = manager.dragOperation;

      if (!position) {
        previousDelta = null;
        scrollIntent.value = null;
        return;
      }

      const {delta} = position;

      if (previousDelta) {
        const directions = {
          x: getDirection(delta.x, previousDelta.x),
          y: getDirection(delta.y, previousDelta.y),
        };

        const intent = scrollIntent.peek() ?? new ScrollIntent();

        batch(() => {
          for (const axis of Axes) {
            for (const direction of DIRECTIONS) {
              if (directions[axis] === direction) {
                intent[axis].unlock(direction);
              }
            }
          }

          scrollIntent.value = intent;
        });
      }

      previousDelta = delta;
    });
  }

  get current(): ScrollIntent | null {
    return this.signal.peek();
  }
}

function getDirection(a: number, b: number): ScrollDirection {
  return Math.sign(a - b);
}