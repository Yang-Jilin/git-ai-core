import json
import os
from pathlib import Path
from typing import Optional, Dict

class GitHubConfig:
    def __init__(self):
        # 与AI配置同目录
        self.config_path = Path("github-config.json")
        self.config = self._load_config()

    def _load_config(self) -> Dict:
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return {"access_token": ""}
        return {"access_token": ""}

    def save_config(self, access_token: str) -> bool:
        config = {"access_token": access_token}
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            self.config = config
            return True
        except Exception as e:
            print(f"保存GitHub配置失败: {e}")
            return False

    def get_access_token(self) -> Optional[str]:
        return self.config.get("access_token")

    def has_valid_token(self) -> bool:
        token = self.get_access_token()
        return bool(token and token.strip())
