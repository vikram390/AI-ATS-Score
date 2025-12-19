import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BulkResultItem } from '../../models/bulk-result-item.model';
import { ScoreDisplayComponent } from '../score-display/score-display.component';

// This is needed to inform TypeScript about the jsPDF global objects
declare const jspdf: any;

@Component({
  selector: 'app-bulk-results',
  standalone: true,
  templateUrl: './bulk-results.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ScoreDisplayComponent]
})
export class BulkResultsComponent {
  results = input.required<BulkResultItem[]>();
  reset = output<void>();

  expandedRow = signal<string | null>(null);

  sortedResults = computed(() => {
    const originalResults = this.results();
    const loadingResults = originalResults.filter(r => r.status === 'loading');
    const successResults = (originalResults
      .filter(r => r.status === 'success') as Extract<BulkResultItem, { status: 'success' }>[])
      .sort((a, b) => b.result.score - a.result.score);
    const errorResults = originalResults.filter(r => r.status === 'error');
    
    return [...loadingResults, ...successResults, ...errorResults];
  });

  toggleExpand(fileName: string): void {
    this.expandedRow.update(current => (current === fileName ? null : fileName));
  }

  downloadAsPdf(): void {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('ATS Resume Shortlist Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const tableData = this.sortedResults()
      .filter((r): r is Extract<BulkResultItem, { status: 'success' }> => r.status === 'success')
      .map((item, index) => {
        return [
          index + 1,
          item.fileName,
          item.result.score,
        ];
      });

    (doc as any).autoTable({
      head: [['Rank', 'File Name', 'ATS Score']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // emerald-500
    });

    doc.save('ats_shortlist_report.pdf');
  }
}
