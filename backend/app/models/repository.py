from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Repository(Base):
    """仓库信息模型 - 只存储路径等基本信息作为索引"""
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    local_path = Column(String(500), unique=True, nullable=False, index=True)
    remote_url = Column(String(500), nullable=True)
    name = Column(String(255), nullable=True)
    clone_date = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "local_path": self.local_path,
            "remote_url": self.remote_url,
            "name": self.name,
            "clone_date": self.clone_date.isoformat() if self.clone_date else None,
            "last_accessed": self.last_accessed.isoformat() if self.last_accessed else None
        }
