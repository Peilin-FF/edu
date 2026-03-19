import { isGithubConnected, getGithubConfig } from '../utils/githubStore';

export default function SyncStatus({ syncing }) {
  const connected = isGithubConnected();
  const { username } = getGithubConfig();

  if (!connected) {
    return (
      <span className="sync-status sync-status--off" title="未连接 GitHub，数据仅存本地">
        &#x26A0; 未同步
      </span>
    );
  }

  if (syncing) {
    return (
      <span className="sync-status sync-status--syncing" title="正在同步到 GitHub...">
        &#x21BB; 同步中
      </span>
    );
  }

  return (
    <span className="sync-status sync-status--ok" title={`已同步到 ${username} 的私有仓库`}>
      &#x2713; 已同步
    </span>
  );
}
