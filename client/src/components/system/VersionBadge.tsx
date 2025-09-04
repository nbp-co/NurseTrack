import { BUILD_INFO } from '../../build-info';

function formatVersion() {
  const label = BUILD_INFO.tag && BUILD_INFO.tag.length > 0
    ? BUILD_INFO.tag
    : `#${BUILD_INFO.sha}`;
  return BUILD_INFO.dirty ? `${label} (dirty)` : label;
}

export function versionStringLong() {
  return `${formatVersion()} • ${new Date(BUILD_INFO.builtAt).toLocaleString()}`;
}

export default function VersionBadge({ inline = false }: { inline?: boolean }) {
  const text = versionStringLong();
  return (
    <span
      aria-label="Build version"
      className={inline ? "text-xs text-muted-foreground" : "text-[11px] text-muted-foreground"}
      title={`branch: ${BUILD_INFO.branch}`}
      data-build-sha={BUILD_INFO.sha}
      data-build-branch={BUILD_INFO.branch}
      data-build-tag={BUILD_INFO.tag}
      data-build-time={BUILD_INFO.builtAt}
    >
      {text}
    </span>
  );
}