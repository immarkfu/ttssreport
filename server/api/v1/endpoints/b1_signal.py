from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from services.b1_signal_service import B1SignalService
from core.database import get_sync_connection
from utils.logger import setup_logger
import pymysql
import json

router = APIRouter()
logger = setup_logger(__name__, 'b1_signal_api.log')


class B1FilterRequest(BaseModel):
    trade_date: str
    custom_tags: Optional[List[str]] = None
    ts_codes: Optional[List[str]] = None
    save_to_db: bool = False
    j_threshold: Optional[float] = None
    macd_dif_threshold: Optional[float] = None


class TagConfigItem(BaseModel):
    id: int
    is_enabled: int  # 0-禁用, 1-启用
    threshold_value: Optional[float] = None

    class Config:
        arbitrary_types_allowed = True


class SaveTagsConfigRequest(BaseModel):
    tags: List[TagConfigItem]
    user_id: Optional[int] = None

    class Config:
        arbitrary_types_allowed = True


class SaveThresholdRequest(BaseModel):
    tag_code: str
    threshold_value: float


@router.post("/filter-and-tag")
async def filter_and_tag(request: B1FilterRequest):
    service = B1SignalService()
    try:
        service.connect()
        result = service.filter_and_tag(
            trade_date=request.trade_date,
            custom_tags=request.custom_tags,
            ts_codes=request.ts_codes,
            save_to_db=request.save_to_db,
            force_refresh_cache=False,
            j_threshold=request.j_threshold,
            macd_dif_threshold=request.macd_dif_threshold
        )
        return result
    except Exception as e:
        logger.error(f"B1信号过滤打标签失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()


@router.get("/tags")
async def get_available_tags():
    service = B1SignalService()
    try:
        service.connect()
        all_tags = service.get_all_tags()
        return {'success': True, 'data': all_tags}
    except Exception as e:
        logger.error(f"获取标签列表失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()


@router.post("/save-tag-config")
async def save_tag_config(request: SaveTagsConfigRequest):
    service = B1SignalService()
    try:
        service.connect()
        tags_data = [{"id": t.id, "is_enabled": t.is_enabled, "threshold_value": t.threshold_value} for t in request.tags]
        result = service.save_tag_config(tags_data, request.user_id)
        return result
    except Exception as e:
        logger.error(f"保存标签配置失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()


@router.post("/save-threshold")
async def save_threshold(request: SaveThresholdRequest):
    service = B1SignalService()
    try:
        service.connect()
        result = service.save_threshold(request.tag_code, request.threshold_value)
        return result
    except Exception as e:
        logger.error(f"保存阈值失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()


@router.post("/clear-cache")
async def clear_stock_cache():
    try:
        B1SignalService.clear_cache()
        return {'success': True, 'message': '缓存已清除'}
    except Exception as e:
        logger.error(f"清除缓存失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache-info")
async def get_cache_info():
    try:
        is_valid = B1SignalService._is_cache_valid()
        
        if is_valid:
            stock_count = len(B1SignalService._stock_list_cache) if B1SignalService._stock_list_cache else 0
            expire_time = B1SignalService._cache_expire_time.strftime('%Y-%m-%d %H:%M:%S')
            return {
                'success': True,
                'cached': True,
                'stock_count': stock_count,
                'expire_time': expire_time
            }
        else:
            return {
                'success': True,
                'cached': False,
                'message': '缓存已过期或未初始化'
            }
    except Exception as e:
        logger.error(f"获取缓存信息失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results")
async def get_b1_signal_results(
    trade_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    j_value: Optional[int] = Query(None, description="J值阈值过滤"),
    matched_tag_codes: Optional[str] = Query(None, description="标签过滤，逗号分隔")
):
    conn = None
    try:
        conn = get_sync_connection()
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        if trade_date:
            sql = "SELECT * FROM b1_signal_results WHERE trade_date = %s ORDER BY tag_score DESC, volume_ratio DESC"
            params = [trade_date]
        else:
            sql = "SELECT * FROM b1_signal_results WHERE trade_date = (SELECT MAX(trade_date) FROM b1_signal_results) ORDER BY tag_score DESC, volume_ratio DESC"
            params = []

        cursor.execute(sql, params)
        results = cursor.fetchall()

        for row in results:
            if row.get('matched_tag_ids'):
                row['matched_tag_ids'] = json.loads(row['matched_tag_ids'])
            if row.get('matched_tag_names'):
                row['matched_tag_names'] = json.loads(row['matched_tag_names'])
            if row.get('matched_tag_codes'):
                row['matched_tag_codes'] = json.loads(row['matched_tag_codes'])

        if j_value is not None:
            results = [row for row in results if row.get('j_value', 0) < j_value]

        if matched_tag_codes:
            from urllib.parse import unquote
            tag_list = unquote(matched_tag_codes).split(',')
            results = [
                row for row in results
                if not row.get('matched_tag_codes') or not any(
                    tag in row['matched_tag_codes'] for tag in tag_list
                )
            ]

        total_count = len(results)
        offset = (page - 1) * page_size
        paginated_results = results[offset:offset + page_size]

        cursor.close()

        return {'success': True, 'total': total_count, 'data': paginated_results, 'page': page, 'page_size': page_size}

    except Exception as e:
        logger.error(f"查询B1信号结果失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/stock-detail")
async def get_stock_detail(code: str = Query(..., description="股票代码，如 000547.SZ")):
    service = B1SignalService()
    try:
        service.connect()
        result = service.get_stock_detail(code)
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=404, detail=result['message'])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取股票详情失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        service.close()
