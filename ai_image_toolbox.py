# -*- coding: utf-8 -*-
"""
AI图片工具箱 - 分类整理 + 水印标记
基于百度AI图像识别API开发
"""

import os
import base64
import time
from pathlib import Path
from typing import List, Dict, Tuple, Optional

import streamlit as st
import requests
from PIL import Image, ImageDraw, ImageFont

# ============================================
# 配置区域 - 请在这里替换你的百度AI API密钥
# ============================================
API_KEY = "0P65UW0i8kMJVr3M84hyQD3l"  # 请替换为你的百度AI API Key
SECRET_KEY = "KMMLxHwIgR38hNFVlIHB0PWh85sqsUk5"  # 请替换为你的百度AI Secret Key

# ============================================
# 全局变量和缓存
# ============================================
# Token缓存，避免重复请求
_ACCESS_TOKEN_CACHE = None
_TOKEN_EXPIRE_TIME = 0

# 图片格式支持
SUPPORTED_IMAGE_FORMATS = [".jpg", ".jpeg", ".png", ".bmp", ".gif"]

# ============================================
# 分类规则定义
# ============================================
分类规则 = {
    "风景": ["山", "水", "天空", "日落", "海边", "建筑", "夜景", "风景", "湖", "河", "云", "雪", "山景", "海景", "城市", "街道", "公园"],
    "美食": ["食物", "美食", "菜", "肉", "水果", "甜品", "火锅", "蛋糕", "面包", "咖啡", "饮料", "寿司", "披萨", "汉堡", "冰淇淋", "巧克力", "米饭", "面条", "饺子"],
    "宠物": ["猫", "狗", "猫咪", "小狗", "兔子", "仓鼠", "宠物", "小猫", "小狗", "鸟", "鱼", "龟"],
    "人物": ["人", "人物", "自拍", "合影", "头像", "脸", "人像", "照片", "人物肖像", "男人", "女人", "孩子", "婴儿"],
    "文档": ["文档", "文字", "表格", "截图", "简历", "合同", "文件", "纸张", "书本", "笔记本", "打印", "手写", "屏幕"],
    "物品": ["手机", "电脑", "杯子", "衣服", "包包", "手表", "鞋子", "眼镜", "帽子", "钥匙", "钱包", "背包", "行李箱", "汽车", "自行车", "家具", "电器"],
    "植物": ["花", "草", "树", "绿植", "多肉", "花朵", "叶子", "树木", "花园", "森林", "植物", "花卉", "盆栽"]
}


# ============================================
# 百度AI API 相关函数
# ============================================
@st.cache_data(ttl=2592000)  # 缓存30天
def 获取百度访问令牌() -> str:
    """
    获取百度AI访问令牌，加入缓存避免重复请求
    返回: 访问令牌字符串
    """
    global _ACCESS_TOKEN_CACHE, _TOKEN_EXPIRE_TIME
    
    # 检查缓存是否有效
    current_time = time.time()
    if _ACCESS_TOKEN_CACHE and current_time < _TOKEN_EXPIRE_TIME:
        return _ACCESS_TOKEN_CACHE
    
    # 构建请求URL
    token_url = "https://aip.baidubce.com/oauth/2.0/token"
    params = {
        "grant_type": "client_credentials",
        "client_id": API_KEY,
        "client_secret": SECRET_KEY
    }
    
    try:
        response = requests.get(token_url, params=params, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        if "access_token" in result:
            _ACCESS_TOKEN_CACHE = result["access_token"]
            # 设置过期时间（提前10分钟过期）
            expires_in = result.get("expires_in", 2592000) - 600
            _TOKEN_EXPIRE_TIME = current_time + expires_in
            return _ACCESS_TOKEN_CACHE
        else:
            error_msg = result.get("error_description", "未知错误")
            st.error(f"❌ 获取访问令牌失败: {error_msg}")
            return ""
            
    except requests.exceptions.Timeout:
        st.error("❌ 请求超时，请检查网络连接")
        return ""
    except requests.exceptions.RequestException as e:
        st.error(f"❌ 网络请求错误: {str(e)}")
        return ""
    except Exception as e:
        st.error(f"❌ 获取访问令牌时发生错误: {str(e)}")
        return ""


def 图片转Base64(图片路径: str) -> Optional[str]:
    """
    将图片文件转换为Base64编码
    参数: 图片路径
    返回: Base64编码字符串，失败返回None
    """
    try:
        with open(图片路径, "rb") as f:
            图片数据 = f.read()
            return base64.b64encode(图片数据).decode("utf-8")
    except FileNotFoundError:
        st.warning(f"⚠️ 文件不存在: {图片路径}")
        return None
    except Exception as e:
        st.warning(f"⚠️ 读取图片 {图片路径} 失败: {str(e)}")
        return None


def 获取文件夹中图片(文件夹路径: str) -> List[str]:
    """
    获取文件夹中所有支持的图片文件
    参数: 文件夹路径
    返回: 图片文件路径列表
    """
    图片列表 = []
    文件夹 = Path(文件夹路径)
    
    if not 文件夹.exists():
        st.error(f"❌ 文件夹不存在: {文件夹路径}")
        return []
    
    for 文件 in 文件夹.iterdir():
        if 文件.is_file() and 文件.suffix.lower() in SUPPORTED_IMAGE_FORMATS:
            图片列表.append(str(文件))
    
    return 图片列表


# ============================================
# 功能1: AI图片分类整理
# ============================================
def 调用通用物体识别API(图片路径: str) -> List[Dict]:
    """
    调用百度AI通用物体识别API
    参数: 图片路径
    返回: 识别结果列表
    """
    access_token = 获取百度访问令牌()
    if not access_token:
        return []
    
    base64图片 = 图片转Base64(图片路径)
    if not base64图片:
        return []
    
    api_url = f"https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token={access_token}"
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {"image": base64图片, "baike_num": 0}
    
    try:
        response = requests.post(api_url, headers=headers, data=data, timeout=15)
        response.raise_for_status()
        result = response.json()
        
        if "result" in result:
            return result["result"]
        else:
            error_msg = result.get("error_msg", "未知错误")
            st.warning(f"⚠️ 识别 {图片路径} 失败: {error_msg}")
            return []
            
    except requests.exceptions.Timeout:
        st.warning(f"⚠️ 识别 {图片路径} 超时")
        return []
    except requests.exceptions.RequestException as e:
        st.warning(f"⚠️ 识别 {图片路径} 网络错误: {str(e)}")
        return []
    except Exception as e:
        st.warning(f"⚠️ 识别 {图片路径} 时发生错误: {str(e)}")
        return []


def 根据识别结果分类(识别结果列表: List[Dict]) -> str:
    """
    根据识别结果判断分类
    参数: 识别结果列表
    返回: 分类名称
    """
    if not 识别结果列表:
        return "其他"
    
    # 合并所有识别结果的关键词
    所有关键词 = []
    for 结果 in 识别结果列表:
        if "keyword" in 结果:
            所有关键词.append(结果["keyword"])
    
    # 按优先级检查分类
    for 分类名, 关键词列表 in 分类规则.items():
        for 关键词 in 关键词列表:
            for 识别关键词 in 所有关键词:
                if 关键词 in 识别关键词 or 识别关键词 in 关键词:
                    return 分类名
    
    return "其他"


def 创建分类文件夹(根目录: str, 分类名: str) -> str:
    """
    创建分类文件夹（如果不存在）
    参数: 根目录, 分类名
    返回: 分类文件夹路径
    """
    分类文件夹 = os.path.join(根目录, 分类名)
    if not os.path.exists(分类文件夹):
        os.makedirs(分类文件夹)
    return 分类文件夹


def 移动图片到分类(图片路径: str, 目标文件夹: str) -> bool:
    """
    将图片移动到目标文件夹
    参数: 图片路径, 目标文件夹
    返回: 是否成功
    """
    try:
        文件名 = os.path.basename(图片路径)
        目标路径 = os.path.join(目标文件夹, 文件名)
        
        # 如果目标文件已存在，添加序号
        计数器 = 1
        while os.path.exists(目标路径):
            名称, 扩展名 = os.path.splitext(文件名)
            目标路径 = os.path.join(目标文件夹, f"{名称}_{计数器}{扩展名}")
            计数器 += 1
        
        os.rename(图片路径, 目标路径)
        return True
    except Exception as e:
        st.warning(f"⚠️ 移动 {图片路径} 失败: {str(e)}")
        return False


def 执行图片分类整理(文件夹路径: str):
    """
    执行AI图片分类整理主函数
    参数: 文件夹路径
    """
    图片列表 = 获取文件夹中图片(文件夹路径)
    
    if not 图片列表:
        st.warning("⚠️ 文件夹中没有找到支持的图片文件")
        return
    
    st.info(f"📁 找到 {len(图片列表)} 张图片")
    
    进度条 = st.progress(0)
    状态文本 = st.empty()
    成功计数 = 0
    失败计数 = 0
    分类统计 = {}
    
    for 索引, 图片路径 in enumerate(图片列表):
        文件名 = os.path.basename(图片路径)
        状态文本.text(f"处理中: {文件名} ({索引+1}/{len(图片列表)})")
        
        # 识别图片
        识别结果 = 调用通用物体识别API(图片路径)
        
        # 分类
        分类名 = 根据识别结果分类(识别结果)
        
        # 更新分类统计
        if 分类名 not in 分类统计:
            分类统计[分类名] = 0
        分类统计[分类名] += 1
        
        # 创建分类文件夹并移动图片
        分类文件夹 = 创建分类文件夹(文件夹路径, 分类名)
        if 移动图片到分类(图片路径, 分类文件夹):
            成功计数 += 1
        else:
            失败计数 += 1
        
        # 更新进度条
        进度条.progress((索引 + 1) / len(图片列表))
    
    # 显示结果
    st.success(f"✅ 分类完成！成功: {成功计数}, 失败: {失败计数}")
    
    if 分类统计:
        st.subheader("📊 分类统计")
        for 分类名, 数量 in 分类统计.items():
            st.write(f"- {分类名}: {数量} 张")


# ============================================
# 功能2: AI水印/杂物标记
# ============================================
def 调用物体检测API(图片路径: str) -> List[Dict]:
    """
    调用百度AI物体检测API
    参数: 图片路径
    返回: 检测结果列表
    """
    access_token = 获取百度访问令牌()
    if not access_token:
        return []
    
    base64图片 = 图片转Base64(图片路径)
    if not base64图片:
        return []
    
    api_url = f"https://aip.baidubce.com/rest/2.0/image-classify/v1/object_detect?access_token={access_token}"
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {"image": base64图片}
    
    try:
        response = requests.post(api_url, headers=headers, data=data, timeout=15)
        response.raise_for_status()
        result = response.json()
        
        if "result" in result and result["result"]:
            return result["result"]
        else:
            error_msg = result.get("error_msg", "未知错误")
            st.warning(f"⚠️ 检测 {图片路径} 失败: {error_msg}")
            return []
            
    except requests.exceptions.Timeout:
        st.warning(f"⚠️ 检测 {图片路径} 超时")
        return []
    except requests.exceptions.RequestException as e:
        st.warning(f"⚠️ 检测 {图片路径} 网络错误: {str(e)}")
        return []
    except Exception as e:
        st.warning(f"⚠️ 检测 {图片路径} 时发生错误: {str(e)}")
        return []


def 在图片上标记物体(图片路径: str, 检测结果: List[Dict]) -> Optional[str]:
    """
    在图片上画矩形框并标注物体名称
    参数: 图片路径, 检测结果列表
    返回: 标记后的图片保存路径，失败返回None
    """
    try:
        # 打开图片
        图片 = Image.open(图片路径).convert("RGB")
        绘图 = ImageDraw.Draw(图片)
        
        # 获取图片尺寸
        图片宽度, 图片高度 = 图片.size
        
        # 尝试加载中文字体
        字体路径 = None
        # Windows系统常见中文字体路径
        可能的字体路径 = [
            "C:/Windows/Fonts/msyh.ttc",  # 微软雅黑
            "C:/Windows/Fonts/simhei.ttf",  # 黑体
            "C:/Windows/Fonts/simsun.ttc",  # 宋体
        ]
        
        for 路径 in 可能的字体路径:
            if os.path.exists(路径):
                字体路径 = 路径
                break
        
        try:
            if 字体路径:
                字体 = ImageFont.truetype(字体路径, 16)
            else:
                字体 = ImageFont.load_default()
        except:
            字体 = ImageFont.load_default()
        
        # 标记每个检测到的物体
        for 物体 in 检测结果:
            if "name" in 物体 and "location" in 物体:
                名称 = 物体["name"]
                位置 = 物体["location"]
                
                # 获取坐标
                x1 = 位置.get("left", 0)
                y1 = 位置.get("top", 0)
                x2 = x1 + 位置.get("width", 0)
                y2 = y1 + 位置.get("height", 0)
                
                # 确保坐标在图片范围内
                x1 = max(0, min(x1, 图片宽度))
                y1 = max(0, min(y1, 图片高度))
                x2 = max(0, min(x2, 图片宽度))
                y2 = max(0, min(y2, 图片高度))
                
                # 画红色矩形框（3px）
                绘图.rectangle([(x1, y1), (x2, y2)], outline="red", width=3)
                
                # 在左上角标注物体名称
                文本位置 = (x1, max(y1 - 20, 0))
                绘图.text(文本位置, 名称, fill="red", font=字体)
        
        # 保存标记后的图片
        文件夹路径 = os.path.dirname(图片路径)
        标记文件夹 = os.path.join(文件夹路径, "AI标记结果")
        if not os.path.exists(标记文件夹):
            os.makedirs(标记文件夹)
        
        原文件名 = os.path.basename(图片路径)
        保存路径 = os.path.join(标记文件夹, f"标记_{原文件名}")
        图片.save(保存路径)
        
        return 保存路径
        
    except Exception as e:
        st.warning(f"⚠️ 标记图片 {图片路径} 失败: {str(e)}")
        return None


def 执行物体标记(文件夹路径: str):
    """
    执行AI水印/杂物标记主函数
    参数: 文件夹路径
    """
    图片列表 = 获取文件夹中图片(文件夹路径)
    
    if not 图片列表:
        st.warning("⚠️ 文件夹中没有找到支持的图片文件")
        return
    
    st.info(f"📁 找到 {len(图片列表)} 张图片")
    
    进度条 = st.progress(0)
    状态文本 = st.empty()
    成功计数 = 0
    失败计数 = 0
    
    for 索引, 图片路径 in enumerate(图片列表):
        文件名 = os.path.basename(图片路径)
        状态文本.text(f"处理中: {文件名} ({索引+1}/{len(图片列表)})")
        
        # 检测物体
        检测结果 = 调用物体检测API(图片路径)
        
        if 检测结果:
            # 标记图片
            保存路径 = 在图片上标记物体(图片路径, 检测结果)
            if 保存路径:
                成功计数 += 1
            else:
                失败计数 += 1
        else:
            st.info(f"ℹ️ {文件名} 未检测到物体")
            失败计数 += 1
        
        # 更新进度条
        进度条.progress((索引 + 1) / len(图片列表))
    
    # 显示结果
    st.success(f"✅ 标记完成！成功: {成功计数}, 失败: {失败计数}")


# ============================================
# Streamlit 主界面
# ============================================
def 主界面():
    """
    Streamlit主界面函数
    """
    # 页面配置
    st.set_page_config(
        page_title="AI图片工具箱（分类整理+水印标记）",
        page_icon="🛠️",
        layout="wide"
    )
    
    # 页面标题
    st.title("🛠️ AI图片工具箱（分类整理+水印标记）")
    st.markdown("---")
    
    # 侧边栏
    with st.sidebar:
        st.header("📋 功能选择")
        功能选择 = st.selectbox(
            "请选择要使用的功能",
            ["AI图片分类整理", "AI水印/杂物标记"]
        )
        
        st.markdown("---")
        st.header("📖 使用说明")
        
        if 功能选择 == "AI图片分类整理":
            st.info("""
            **AI图片分类整理功能：**
            1. 输入图片文件夹路径
            2. 点击「开始一键分类」按钮
            3. 系统会自动识别图片内容并分类
            4. 分类完成后图片会移动到对应文件夹
            
            **支持的分类：**
            风景、美食、宠物、人物、文档、物品、植物、其他
            """)
        else:
            st.info("""
            **AI水印/杂物标记功能：**
            1. 输入图片文件夹路径
            2. 点击「开始一键标记」按钮
            3. 系统会自动检测图片中的物体
            4. 用红色矩形框标记物体位置
            5. 标记后的图片保存到「AI标记结果」文件夹
            """)
        
        st.markdown("---")
        st.header("⚠️ 注意事项")
        st.warning("""
        - 使用前请确保已配置百度AI API Key
        - 需要网络连接才能调用AI服务
        - 处理大量图片可能需要较长时间
        - 建议先备份原始图片
        """)
    
    # 主界面
    st.subheader(f"🎯 当前功能：{功能选择}")
    
    # 文件夹路径输入
    文件夹路径 = st.text_input(
        "📁 请输入图片文件夹路径",
        placeholder="例如：C:/Users/用户名/Desktop/图片"
    )
    
    # 检查文件夹是否存在
    if 文件夹路径:
        if not os.path.exists(文件夹路径):
            st.error("❌ 文件夹不存在，请检查路径")
        elif not os.path.isdir(文件夹路径):
            st.error("❌ 路径不是文件夹，请重新输入")
        else:
            st.success("✅ 文件夹路径有效")
    
    st.markdown("---")
    
    # 主按钮
    if 功能选择 == "AI图片分类整理":
        if st.button("🚀 开始一键分类", use_container_width=True, type="primary"):
            if 文件夹路径 and os.path.exists(文件夹路径):
                with st.spinner("正在处理中..."):
                    执行图片分类整理(文件夹路径)
            else:
                st.error("❌ 请先输入有效的文件夹路径")
    else:
        if st.button("🚀 开始一键标记", use_container_width=True, type="primary"):
            if 文件夹路径 and os.path.exists(文件夹路径):
                with st.spinner("正在处理中..."):
                    执行物体标记(文件夹路径)
            else:
                st.error("❌ 请先输入有效的文件夹路径")


# ============================================
# 程序入口
# ============================================
if __name__ == "__main__":
    主界面()

"""
运行说明：
1. 首先安装依赖库：
   pip install streamlit requests pillow

2. 配置百度AI API Key：
   在代码开头的 API_KEY 和 SECRET_KEY 处填入你的密钥

3. 运行程序：
   streamlit run ai_image_toolbox.py

4. 在浏览器中打开显示的地址使用
"""
