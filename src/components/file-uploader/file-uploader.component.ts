import { Component, ChangeDetectionStrategy, output, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  templateUrl: './file-uploader.component.html',
  host: {
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class FileUploaderComponent {
  filesSelected = output<File[]>();
  isDragging = signal(false);
  multiple = input<boolean>(true);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesSelected.emit(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = this.multiple() ? Array.from(event.dataTransfer.files) : [event.dataTransfer.files[0]];
      this.filesSelected.emit(files);
    }
  }
}
