import { toValue } from 'vue';
import { SegmentMetadata, ResolvedSegmentMetadata } from './types';

export function resolveSegmentMetadata(segment: SegmentMetadata): ResolvedSegmentMetadata {
  return {
    ...segment,
    name: toValue(segment.name) ?? '',
  };
}
