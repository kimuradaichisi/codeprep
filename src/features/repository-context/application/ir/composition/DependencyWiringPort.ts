import type {
  WiringAnalysisInput,
  WiringAnalysisResult,
  WiringCapabilities,
} from './WiringRelationDto';

export interface DependencyWiringPort {
  getCapabilities(): WiringCapabilities;
  analyze(input: WiringAnalysisInput): Promise<WiringAnalysisResult>;
}
