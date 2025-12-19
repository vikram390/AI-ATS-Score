
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GeminiService } from './services/gemini.service';
import { AtsResult } from './models/ats-result.model';
import { BulkResultItem } from './models/bulk-result-item.model';
import { FileUploaderComponent } from './components/file-uploader/file-uploader.component';
import { ScoreDisplayComponent } from './components/score-display/score-display.component';
import { BulkResultsComponent } from './components/bulk-results/bulk-results.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FileUploaderComponent,
    ScoreDisplayComponent,
    BulkResultsComponent,
  ],
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);

  // Core state management
  status = signal<'idle' | 'files-selected' | 'loading' | 'success' | 'error'>('idle');
  mode = signal<'single' | 'bulk'>('single');
  error = signal<string | null>(null);

  // Data signals
  jobDescription = signal('');
  selectedFiles = signal<File[]>([]);
  results = signal<BulkResultItem[]>([]);

  private readonly MAX_FILES_BULK = 10;
  private readonly MAX_FILE_SIZE_MB = 4;

  handleFilesSelected(files: File[]): void {
    this.error.set(null);
    let currentFiles = this.selectedFiles();
    let newFiles = [...files];

    if (this.mode() === 'single') {
      currentFiles = [];
    } else {
      newFiles = newFiles.filter(nf => !currentFiles.some(cf => cf.name === nf.name));
    }

    // File validation
    const tooLarge = newFiles.find(f => f.size > this.MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      this.error.set(`File "${tooLarge.name}" is larger than the ${this.MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }

    const combined = [...currentFiles, ...newFiles];
    if (this.mode() === 'bulk' && combined.length > this.MAX_FILES_BULK) {
      this.error.set(`You can select a maximum of ${this.MAX_FILES_BULK} files.`);
      this.selectedFiles.set(combined.slice(0, this.MAX_FILES_BULK));
    } else {
      this.selectedFiles.set(combined);
    }
    
    if (this.selectedFiles().length > 0) {
      this.status.set('files-selected');
    } else {
      this.status.set('idle');
    }
  }

  addMoreFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFilesSelected(Array.from(input.files));
      input.value = ''; // Reset input to allow re-selecting the same file
    }
  }

  removeFile(fileName: string): void {
    this.selectedFiles.update(files => files.filter(f => f.name !== fileName));
    if (this.selectedFiles().length === 0) {
      this.status.set('idle');
    }
  }

  async startAnalysis(): Promise<void> {
    this.error.set(null);
    const filesToProcess = this.selectedFiles();

    // Set initial state to loading for all files and switch to results view
    this.results.set(filesToProcess.map(file => ({ fileName: file.name, status: 'loading' })));
    this.status.set('success');

    for (const file of filesToProcess) {
      try {
        const { content, mimeType } = await this.readFileAsBase64(file);
        const analysisResult = await this.geminiService.analyzeResume(this.jobDescription(), content, mimeType, this.mode());
        
        this.results.update(currentResults => {
          const index = currentResults.findIndex(r => r.fileName === file.name);
          if (index === -1) return currentResults;
          const updatedResults = [...currentResults];
          updatedResults[index] = { fileName: file.name, status: 'success', result: analysisResult };
          return updatedResults;
        });

      } catch (e: any) {
         this.results.update(currentResults => {
          const index = currentResults.findIndex(r => r.fileName === file.name);
          if (index === -1) return currentResults;
          const updatedResults = [...currentResults];
          updatedResults[index] = { fileName: file.name, status: 'error', error: e.message || 'Analysis failed' };
          return updatedResults;
        });
      }
    }
  }

  private readFileAsBase64(file: File): Promise<{ content: string, mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Content = result.split(',')[1];
        if (base64Content) {
          resolve({ content: base64Content, mimeType: file.type });
        } else {
          reject(new Error(`Could not read content of file: ${file.name}`));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
  
  reset(): void {
    this.status.set('idle');
    this.selectedFiles.set([]);
    this.results.set([]);
    this.error.set(null);
    this.jobDescription.set('');
  }

  setMode(mode: 'single' | 'bulk'): void {
    if (this.mode() !== mode) {
      this.mode.set(mode);
      this.reset();
    }
  }
}
