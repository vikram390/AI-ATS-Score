
import { AtsResult } from './ats-result.model';

export type BulkResultItem = {
  fileName: string;
  status: 'success';
  result: AtsResult;
} | {
  fileName:string;
  status: 'error';
  error: string;
} | {
  fileName: string;
  status: 'loading';
};
