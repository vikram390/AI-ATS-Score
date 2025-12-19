import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AtsResult } from '../../models/ats-result.model';

@Component({
  selector: 'app-score-display',
  standalone: true,
  templateUrl: './score-display.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ScoreDisplayComponent {
  result = input.required<AtsResult>();

  // For the circular progress bar
  readonly circumference = 2 * Math.PI * 54; // 2 * pi * r (radius is 54)
  
  strokeDashoffset = computed(() => {
    const score = this.result().score;
    return this.circumference - (score / 100) * this.circumference;
  });

  scoreColorClass = computed(() => {
    const score = this.result().score;
    if (score >= 85) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-500';
  });

  strokeColorClass = computed(() => {
    const score = this.result().score;
    if (score >= 85) return 'stroke-green-400';
    if (score >= 60) return 'stroke-amber-400';
    return 'stroke-red-500';
  });
}
