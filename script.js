document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const imageUpload = document.getElementById('imageUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const addAnnotationBtn = document.getElementById('addAnnotation');
    const annotationList = document.getElementById('annotationList');
    const processBatchBtn = document.getElementById('processBatch');
    const batchTextarea = document.getElementById('batchInput');
    const annotationCounter = document.getElementById('annotationCounter');
    
    // 分辨率相关元素
    const resolutionRadios = document.querySelectorAll('input[name="resolution"]');
    const customWidthInput = document.getElementById('customWidth');
    const customHeightInput = document.getElementById('customHeight');
    const applyResolutionBtn = document.getElementById('applyResolution');
    
    // 缩放控制相关元素
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomResetBtn = document.getElementById('resetZoom');
    const zoomLevelEl = document.getElementById('zoomLevel');
    
    // 初始化文件上传区域
    const uploadArea = document.querySelector('.upload-area');
    const uploadButton = uploadArea.querySelector('button');
    
    uploadArea.addEventListener('click', function(e) {
        if (e.target !== uploadButton) {
            imageUpload.click();
        }
    });
    
    uploadButton.addEventListener('click', function(e) {
        e.stopPropagation();
        imageUpload.click();
    });
    
    // 支持拖放上传
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            imageUpload.files = e.dataTransfer.files;
            const event = new Event('change');
            imageUpload.dispatchEvent(event);
        }
    });
    
    // 标签切换功能
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 默认选择批量输入标签
    document.querySelector('.tab-btn[data-tab="batch"]').click();
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有active类
            tabBtns.forEach(b => b.classList.remove('active'));
            
            // 隐藏所有标签内容
            tabContents.forEach(content => content.style.display = 'none');
            
            // 添加当前标签的active类
            this.classList.add('active');
            
            // 显示对应标签内容
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-input`).style.display = 'block';
        });
    });
    
    // 存储原始图像
    let originalImage = null;
    
    // 存储所有标注
    let annotations = [];
    
    // 缩放比例
    let zoomLevel = 1;
    
    // 当前分辨率设置
    let currentResolution = {
        width: 1920,
        height: 1080
    };
    
    // 随机颜色生成
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    
    // 开关自定义分辨率输入
    resolutionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const isCustom = this.value === 'custom';
            customWidthInput.disabled = !isCustom;
            customHeightInput.disabled = !isCustom;
            
            if (!isCustom) {
                // 预设分辨率值
                let resHeight = 0;
                switch(this.value) {
                    case '1280':
                        resHeight = 720;
                        break;
                    case '1440':
                        resHeight = 900;
                        break;
                    case '1920':
                        resHeight = 1080;
                        break;
                }
                
                customWidthInput.value = this.value;
                customHeightInput.value = resHeight;
            }
        });
    });
    
    // 更新分辨率设置UI
    function updateResolutionUI(width, height) {
        // 显示原始分辨率信息
        const originalResolutionInfo = document.getElementById('originalResolution');
        if (originalResolutionInfo) {
            originalResolutionInfo.querySelector('.value').textContent = `${width} × ${height}`;
            originalResolutionInfo.style.display = 'flex';
        }
        
        // 更新建议分辨率信息
        const suggestedResolutionInfo = document.getElementById('suggestedResolution');
        if (suggestedResolutionInfo) {
            suggestedResolutionInfo.querySelector('.value').textContent = `${width} × ${height}`;
            suggestedResolutionInfo.style.display = 'flex';
        }
        
        // 更新自定义分辨率输入框
        document.getElementById('resCustom').checked = true;
        customWidthInput.value = width;
        customHeightInput.value = height;
        customWidthInput.disabled = false;
        customHeightInput.disabled = false;
    }
    
    // 调整画布大小并绘制
    function resizeAndDrawCanvas() {
        // 设置canvas尺寸
        imageCanvas.width = currentResolution.width;
        imageCanvas.height = currentResolution.height;
        
        // 应用缩放
        applyZoom();
        
        // 绘制图像
        drawImage();
    }
    
    // 应用分辨率按钮
    applyResolutionBtn.addEventListener('click', function() {
        if (!originalImage) {
            alert('请先上传图片!');
            return;
        }
        
        let width, height;
        const selectedResolution = document.querySelector('input[name="resolution"]:checked').value;
        
        if (selectedResolution === 'custom') {
            width = parseInt(customWidthInput.value);
            height = parseInt(customHeightInput.value);
            
            if (!width || !height || width < 800 || height < 600) {
                alert('请输入有效的分辨率（宽度至少800px，高度至少600px）');
                return;
            }
        } else {
            width = parseInt(selectedResolution);
            height = width === 1280 ? 720 : (width === 1440 ? 900 : 1080);
        }
        
        // 更新当前分辨率
        currentResolution = {
            width: width,
            height: height
        };
        
        // 重置缩放
        zoomLevel = 1;
        updateZoomUI();
        
        // 重绘画布
        resizeAndDrawCanvas();
    });
    
    // 处理图片上传
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.match('image.*')) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                // 创建新图像对象
                originalImage = new Image();
                originalImage.src = event.target.result;
                
                // 图像加载完成后渲染到画布
                originalImage.onload = function() {
                    // 直接使用图片的原始分辨率
                    currentResolution = {
                        width: originalImage.width,
                        height: originalImage.height
                    };
                    
                    // 更新分辨率设置UI
                    updateResolutionUI(originalImage.width, originalImage.height);
                    
                    // 重置缩放
                    zoomLevel = 1;
                    updateZoomUI();
                    
                    // 重绘画布
                    resizeAndDrawCanvas();
                    
                    // 清空标注
                    annotations = [];
                    updateAnnotationCounter();
                    annotationList.innerHTML = '';
                };
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // 缩放功能
    zoomInBtn.addEventListener('click', function() {
        if (zoomLevel < 3) {
            zoomLevel += 0.1;
            updateZoomUI();
            applyZoom();
            drawImage();
        }
    });
    
    zoomOutBtn.addEventListener('click', function() {
        if (zoomLevel > 0.3) {
            zoomLevel -= 0.1;
            updateZoomUI();
            applyZoom();
            drawImage();
        }
    });
    
    zoomResetBtn.addEventListener('click', function() {
        zoomLevel = 1;
        updateZoomUI();
        applyZoom();
        drawImage();
    });
    
    // 更新缩放UI
    function updateZoomUI() {
        zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
    
    // 应用缩放
    function applyZoom() {
        const canvasContainer = document.querySelector('.canvas-container');
        
        // 设置实际尺寸（考虑缩放）
        const scaledWidth = imageCanvas.width * zoomLevel;
        const scaledHeight = imageCanvas.height * zoomLevel;
        
        imageCanvas.style.width = `${scaledWidth}px`;
        imageCanvas.style.height = `${scaledHeight}px`;
    }
    
    // 绘制图像和所有标注
    function drawImage() {
        // 清空画布
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        
        // 绘制原始图像
        if (originalImage) {
            // 绘制适合画布大小的图像
            ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);
        } else {
            // 绘制提示文字
            ctx.fillStyle = '#ccc';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('请上传图片', imageCanvas.width / 2, imageCanvas.height / 2);
        }
        
        // 绘制所有标注
        annotations.forEach(annotation => {
            drawAnnotation(ctx, annotation);
        });
    }
    
    // 在画布上绘制单个标注
    function drawAnnotation(ctx, annotation) {
        const { x1, y1, x2, y2, color, label, component } = annotation;
        
        // 计算尺寸
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        // 计算实际的起始坐标（确保x1, y1是左上角点）
        const startX = Math.min(x1, x2);
        const startY = Math.min(y1, y2);
        
        // 设置矩形边框样式
        ctx.strokeStyle = color || '#4080FF';
        ctx.lineWidth = 2;
        
        // 绘制带轻微透明度的填充
        ctx.fillStyle = `${color || '#4080FF'}33`; // 添加20%透明度
        ctx.fillRect(startX, startY, width, height);
        
        // 绘制边框
        ctx.strokeRect(startX, startY, width, height);
        
        // 准备绘制标签
        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = '#fff';
        
        // 创建标签背景
        let labelText = label || annotation.description || '';
        let componentText = component || '';
        const titleText = labelText + (componentText ? ` (${componentText})` : '');
        const dimensionText = `${width.toFixed(0)}×${height.toFixed(0)}`;
        
        // 计算所需的标签宽度和高度
        const displayTitle = titleText.length > 30 ? titleText.substring(0, 27) + '...' : titleText;
        const titleWidth = ctx.measureText(displayTitle).width;
        const dimensionWidth = ctx.measureText(dimensionText).width;
        const labelWidth = Math.max(titleWidth, dimensionWidth) + 10;
        
        // 根据是否有标签内容调整高度
        const labelHeight = titleText ? 42 : 24;
        
        // 标签位置：优先显示在矩形上方，如果空间不足则显示在下方
        let labelX = startX;
        let labelY = startY - labelHeight - 5;
        
        // 如果标签会超出画布顶部，则放在矩形下方
        if (labelY < 5) {
            labelY = startY + height + 5;
        }
        
        // 绘制标签背景
        ctx.fillStyle = color || '#4080FF';
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
        
        // 绘制标签文本
        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        
        if (displayTitle) {
            ctx.fillText(displayTitle, labelX + 5, labelY + 14);
        }
        
        // 绘制尺寸文本
        ctx.fillText(dimensionText, labelX + 5, labelY + (displayTitle ? 32 : 14));
        
        // 绘制选择点（四个角落）
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = color || '#4080FF';
        ctx.lineWidth = 1;
        
        const cornerSize = 6;
        
        // 左上角
        drawCornerHandle(ctx, startX, startY, cornerSize);
        // 右上角
        drawCornerHandle(ctx, startX + width, startY, cornerSize);
        // 左下角
        drawCornerHandle(ctx, startX, startY + height, cornerSize);
        // 右下角
        drawCornerHandle(ctx, startX + width, startY + height, cornerSize);
    }
    
    // 绘制角落的小方块手柄
    function drawCornerHandle(ctx, x, y, size) {
        const halfSize = size / 2;
        ctx.fillRect(x - halfSize, y - halfSize, size, size);
        ctx.strokeRect(x - halfSize, y - halfSize, size, size);
    }
    
    // 添加标注
    addAnnotationBtn.addEventListener('click', function() {
        if (!originalImage) {
            alert('请先上传图片!');
            return;
        }
        
        const x = parseInt(document.getElementById('x').value);
        const y = parseInt(document.getElementById('y').value);
        const w = parseInt(document.getElementById('w').value);
        const h = parseInt(document.getElementById('h').value);
        
        // 验证输入
        if (isNaN(x) || isNaN(y)) {
            alert('请输入有效的坐标值!');
            return;
        }
        
        // 宽高模式：输入为起点坐标和宽高
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
            alert('请输入有效的宽度和高度!');
            return;
        }
        
        const x1 = x;
        const y1 = y;
        const x2 = x + w;
        const y2 = y + h;
        
        // 清空输入框
        document.getElementById('x').value = '';
        document.getElementById('y').value = '';
        document.getElementById('w').value = '';
        document.getElementById('h').value = '';
        
        addAnnotationFromCoords(x1, y1, x2, y2);
    });
    
    // 从坐标添加标注
    function addAnnotationFromCoords(x1, y1, x2, y2, label = '', component = '', isCssFormat = false) {
        // 如果没有上传图片，不允许添加标注
        if (!originalImage) {
            console.error("没有上传图片，无法添加标注");
            return false;
        }
        
        console.log(`正在添加标注: 从(${x1},${y1})到(${x2},${y2}), 标签: ${label}, 组件: ${component}`);
        
        let coords;
        
        // 如果是CSS格式，需要特殊处理坐标
        if (isCssFormat) {
            // 获取画布的实际显示尺寸
            const canvasRect = imageCanvas.getBoundingClientRect();
            const scaleRatio = canvasRect.width / imageCanvas.width; // 计算实际缩放比例
            
            // 对于CSS格式的坐标，我们进行特殊的坐标转换
            coords = {
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2
            };
            
            // 记录原始CSS坐标用于显示
            coords.originalCoords = {
                x1: x1,
                y1: y1,
                width: x2 - x1,
                height: y2 - y1
            };
        } else {
            // 普通坐标格式，确保x2 > x1, y2 > y1
            coords = {
                x1: Math.min(x1, x2),
                y1: Math.min(y1, y2),
                x2: Math.max(x1, x2),
                y2: Math.max(y1, y2)
            };
        }
        
        // 验证坐标范围
        if (coords.x1 < 0 || coords.y1 < 0 || 
            coords.x2 > imageCanvas.width || coords.y2 > imageCanvas.height) {
            alert(`坐标 (${x1},${y1})-(${x2},${y2}) 超出图片范围!`);
            return false;
        }
        
        // 生成随机颜色
        const color = getRandomColor();
        
        // 添加到标注列表
        const annotation = { 
            ...coords, 
            color, 
            label, 
            component, 
            isCssFormat,
            // 添加尺寸信息，便于后续访问
            width: coords.x2 - coords.x1,
            height: coords.y2 - coords.y1
        };
        annotations.push(annotation);
        
        // 绘制图像和标注
        drawImage();
        
        // 更新标注列表UI
        updateAnnotationList();
        updateAnnotationCounter();
        
        return true;
    }
    
    // 更新标注计数器
    function updateAnnotationCounter() {
        const counter = document.getElementById('annotationCounter');
        if (counter) {
            counter.textContent = annotations.length;
        }
    }
    
    // 更新标注列表UI
    function updateAnnotationList() {
        const annotationList = document.getElementById('annotationList');
        
        // 清空现有列表
        annotationList.innerHTML = '';
        
        // 更新标注计数
        updateAnnotationCounter();
        
        // 如果没有标注，显示提示信息
        if (annotations.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-annotation';
            emptyMessage.innerHTML = `
                <div class="arco-empty">
                    <div class="arco-empty-image">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M32 56C45.2548 56 56 45.2548 56 32C56 18.7452 45.2548 8 32 8C18.7452 8 8 18.7452 8 32C8 45.2548 18.7452 56 32 56Z" fill="#E8F3FF" stroke="#4080FF" stroke-width="1.5"/>
                            <path d="M32 27C30.8954 27 30 27.8954 30 29V37C30 38.1046 30.8954 39 32 39C33.1046 39 34 38.1046 34 37V29C34 27.8954 33.1046 27 32 27Z" fill="#165DFF"/>
                            <path d="M32 24C33.1046 24 34 23.1046 34 22C34 20.8954 33.1046 20 32 20C30.8954 20 30 20.8954 30 22C30 23.1046 30.8954 24 32 24Z" fill="#165DFF"/>
                        </svg>
                    </div>
                    <div class="arco-empty-description">暂无标注</div>
                </div>
            `;
            annotationList.appendChild(emptyMessage);
            return;
        }
        
        // 添加每个标注项
        annotations.forEach((annotation, index) => {
            const annotationItem = document.createElement('div');
            annotationItem.className = 'annotation-item';
            
            // 计算宽高
            const width = annotation.width || (annotation.x2 - annotation.x1);
            const height = annotation.height || (annotation.y2 - annotation.y1);
            
            // 获取标注文本内容
            let title = annotation.label || annotation.description || `标注 ${index + 1}`;
            let component = annotation.component || '';
            let position = `(${annotation.x1}, ${annotation.y1})`;
            let dimensionInfo = `${width}×${height}`;
            
            // 构建标注项内容
            annotationItem.innerHTML = `
                <div class="annotation-item-left">
                    <span class="annotation-color" style="background-color:${annotation.color}"></span>
                    <div>
                        <div class="annotation-title">${title}</div>
                        <div class="annotation-details">
                            <span class="component-name">${component}</span>
                            <span class="coords">${position} | ${dimensionInfo}</span>
                        </div>
                    </div>
                </div>
                <button class="arco-btn arco-btn-secondary arco-btn-shape-circle arco-btn-size-mini delete-btn" data-index="${index}">
                    <i class="arco-icon arco-icon-delete"></i>
                </button>
            `;
            
            // 添加删除事件监听
            const deleteBtn = annotationItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                annotations.splice(index, 1);
                updateAnnotationList();
                drawImage();
            });
            
            annotationList.appendChild(annotationItem);
        });
    }
    
    // 解析Markdown格式的标注数据
    function parseMarkdownAnnotation(text) {
        const result = [];
        const sections = text.split(/##\s+\d+\./); // 按章节分割
        
        sections.forEach(section => {
            if (!section.trim()) return;
            
            // 提取组件类型
            let componentType = '';
            const typeMatch = section.match(/\*\*组件类型\*\*：([^\n]+)/);
            if (typeMatch) {
                componentType = typeMatch[1].trim();
            }
            
            // 提取组件布局
            let width = 0, height = 0;
            const layoutMatch = section.match(/\*\*组件布局\*\*：[^\n]*W:\s*([^,\n]+),\s*H:\s*([^\n]+)/);
            if (layoutMatch) {
                const rawWidth = layoutMatch[1].trim();
                const rawHeight = layoutMatch[2].trim();
                
                // 处理百分比和像素值
                width = rawWidth.includes('%') ? 
                    Math.floor(parseInt(rawWidth) * currentResolution.width / 100) :
                    parseInt(rawWidth);
                height = rawHeight.includes('%') ?
                    Math.floor(parseInt(rawHeight) * currentResolution.height / 100) :
                    parseInt(rawHeight);
                
                // 移除px单位
                width = width.toString().replace('px', '');
                height = height.toString().replace('px', '');
            }
            
            // 提取坐标
            let x = 0, y = 0;
            const coordMatch = section.match(/\*\*坐标\*\*：[^\n]*X:\s*([^,\n]+),\s*Y:\s*([^\n]+)/);
            if (coordMatch) {
                const rawX = coordMatch[1].trim();
                const rawY = coordMatch[2].trim();
                
                // 处理百分比和像素值
                x = rawX.includes('%') ?
                    Math.floor(parseInt(rawX) * currentResolution.width / 100) :
                    parseInt(rawX);
                y = rawY.includes('%') ?
                    Math.floor(parseInt(rawY) * currentResolution.height / 100) :
                    parseInt(rawY);
                
                // 移除px单位
                x = x.toString().replace('px', '');
                y = y.toString().replace('px', '');
            }
            
            // 提取对应Ant组件
            let antComponent = '';
            const componentMatch = section.match(/\*\*对应Ant组件\*\*：([^\n]+)/);
            if (componentMatch) {
                antComponent = componentMatch[1].trim();
            }
            
            if (componentType && width > 0 && height > 0) {
                result.push({
                    description: componentType,
                    coordinates: `(${x},${y},${width},${height})`,
                    component: antComponent,
                    x: parseInt(x),
                    y: parseInt(y),
                    width: parseInt(width),
                    height: parseInt(height)
                });
            }
        });
        
        return result;
    }
    
    // 解析自然语言描述格式的标注数据
    function parseNaturalLanguageFormat(text) {
        console.log("开始解析自然语言描述格式");
        const result = [];
        
        // 使用标题行（不以固定前缀开头的行）来分割不同的组件描述
        const componentBlocks = [];
        let currentBlock = [];
        
        // 按行分割
        const allLines = text.split('\n');
        
        // 定义标题行的模式（不以组件类型/布局/坐标/对应ant组件开头的非空行）
        const titleLinePattern = /^(?!组件类型|组件布局|坐标|对应ant组件).+/;
        
        // 根据标题行分割不同的组件块
        let currentTitle = '';
        
        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i].trim();
            if (!line) continue; // 跳过空行
            
            if (titleLinePattern.test(line) && 
               !(line.startsWith('组件类型') || line.startsWith('组件布局') || 
                 line.startsWith('坐标') || line.startsWith('对应ant组件'))) {
                // 如果是新的标题行，且之前已经有内容，则保存之前的块
                if (currentBlock.length > 0) {
                    componentBlocks.push(currentBlock);
                    currentBlock = [];
                }
                currentTitle = line;
                currentBlock.push(line);
            } else {
                // 继续当前块
                currentBlock.push(line);
            }
        }
        
        // 添加最后一个块
        if (currentBlock.length > 0) {
            componentBlocks.push(currentBlock);
        }
        
        console.log(`识别到 ${componentBlocks.length} 个组件块`);
        
        // 处理每个组件块
        componentBlocks.forEach((lines, index) => {
            console.log(`处理组件块 ${index + 1}:`, lines[0]);
            
            // 为每个组件创建一个对象
            let currentComponent = {
                title: '',
                type: '',
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                component: ''
            };
            
            // 第一行通常是标题
            if (lines[0].trim()) {
                currentComponent.title = lines[0].trim();
                console.log(`标题: ${currentComponent.title}`);
                
                // 判断是否包含括号中的组件名
                if (lines[0].includes('（') && lines[0].includes('）')) {
                    const matches = lines[0].match(/（(.+?)）/);
                    if (matches) {
                        currentComponent.component = matches[1];
                        currentComponent.title = lines[0].split('（')[0].trim();
                        console.log(`从标题提取组件: ${currentComponent.component}`);
                    }
                }
            }
            
            // 解析每一行
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();
                if (!line) continue;
                
                // 解析组件类型
                if (line.startsWith('组件类型:') || line.startsWith('组件类型：')) {
                    currentComponent.type = line.split(/[:：]/)[1].trim();
                    console.log(`组件类型: ${currentComponent.type}`);
                }
                // 解析组件布局
                else if (line.startsWith('组件布局:') || line.startsWith('组件布局：')) {
                    const layoutMatch = line.match(/W\s*[:：]\s*(\d+)\s*,\s*H\s*[:：]\s*(\d+)/i);
                    if (layoutMatch) {
                        currentComponent.width = parseInt(layoutMatch[1]);
                        currentComponent.height = parseInt(layoutMatch[2]);
                        console.log(`组件布局: W=${currentComponent.width}, H=${currentComponent.height}`);
                    }
                }
                // 解析坐标
                else if (line.startsWith('坐标:') || line.startsWith('坐标：')) {
                    // 支持多种格式的X和Y坐标解析
                    const coordMatch = line.match(/X\s*[:：]\s*(\d+)\s*,\s*Y\s*[:：]\s*(\d+)/i);
                    if (coordMatch) {
                        currentComponent.x = parseInt(coordMatch[1]);
                        currentComponent.y = parseInt(coordMatch[2]);
                        console.log(`坐标: X=${currentComponent.x}, Y=${currentComponent.y}`);
                    }
                }
                // 解析对应ant组件
                else if (line.toLowerCase().startsWith('对应ant组件:') || line.toLowerCase().startsWith('对应ant组件：')) {
                    currentComponent.component = line.split(/[:：]/)[1].trim();
                    console.log(`对应组件: ${currentComponent.component}`);
                }
            }
            
            // 如果所有必要信息都已收集，添加到结果中
            if (currentComponent.width > 0 && currentComponent.height > 0 && 
                (currentComponent.x >= 0 || currentComponent.y >= 0)) {
                // 如果标题为空，使用组件类型或"未命名组件"
                if (!currentComponent.title) {
                    currentComponent.title = currentComponent.type || `未命名组件${index+1}`;
                }
                
                const componentResult = {
                    description: currentComponent.title,
                    coordinates: `(${currentComponent.x},${currentComponent.y},${currentComponent.width},${currentComponent.height})`,
                    component: currentComponent.component,
                    x: currentComponent.x,
                    y: currentComponent.y,
                    width: currentComponent.width,
                    height: currentComponent.height
                };
                
                result.push(componentResult);
                
                console.log("添加解析结果:", componentResult);
            } else {
                console.warn("组件信息不完整，跳过:", currentComponent);
            }
        });
        
        console.log(`解析完成，共找到 ${result.length} 个组件`);
        return result;
    }
    
    // 修改parseTableData函数，添加对自然语言格式的支持
    function parseTableData(text) {
        // 检查是否是自然语言描述格式
        const naturalLanguagePattern = /组件类型\s*[:：]|组件布局\s*[:：]|坐标\s*[:：]/i;
        if (naturalLanguagePattern.test(text)) {
            console.log("检测到自然语言描述格式");
            return parseNaturalLanguageFormat(text);
        }
        
        // 检查是否是Markdown格式
        if (text.includes('## 1.') && text.includes('**组件类型**')) {
            return parseMarkdownAnnotation(text);
        }
        
        // 尝试使用增强的Markdown表格解析
        const enhancedMarkdownResult = parseEnhancedMarkdownTable(text);
        if (enhancedMarkdownResult.length > 0) {
            console.log("使用增强的Markdown表格解析成功");
            return enhancedMarkdownResult;
        }
        
        const result = [];
        
        // 分割为行
        const lines = text.split('\n').filter(line => line.trim());
        
        // 判断表格格式类型：Markdown表格(|分隔) 或 制表符分隔
        const isMarkdownTable = lines[0].includes('|');
        const isTabSeparated = !isMarkdownTable && lines[0].includes('\t');
        
        // 检查是否是新格式（四列制表符分隔）
        const isFourColumnFormat = isTabSeparated && 
            (lines[0].includes('组件布局') || lines[0].includes('坐标范围')) || 
            (lines.length > 1 && lines[1].includes('(') && lines[1].split('\t').length >= 4);
        
        // 检查是否是用户自定义格式
        const isCustomFormat = lines[0].includes('组件类型') && 
                               lines[0].includes('组件布局') && 
                               lines[0].includes('坐标') && 
                               lines[0].includes('对应组件');
                               
        // 检查是否是制表符分隔的MD表格格式
        const isMdTableFormat = isTabSeparated && 
                               (lines[0].includes('组件类型') && 
                               (lines[0].includes('组件布局') || lines[0].includes('W×H') || lines[0].includes('W*H')) && 
                               (lines[0].includes('坐标') || lines[0].includes('X,Y')));
        
        // 跳过表头
        let startIndex = 0;
        if (isMarkdownTable || isTabSeparated) {
            startIndex = 1;
        }
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.includes('---')) continue;  // 跳过空行和分隔行
            
            if (isMdTableFormat) {
                // 处理制表符分隔的MD表格格式
                const cells = line.split('\t').map(cell => cell.trim());
                if (cells.length >= 3) {
                    // 提取组件类型
                    const componentType = cells[0];
                    
                    // 提取宽高信息 - 格式可能是 "640×320" 或 "640*320"
                    let width = 0, height = 0;
                    const layoutText = cells[1];
                    const layoutMatch = layoutText.match(/(\d+)[×*xX](\d+)/);
                    if (layoutMatch) {
                        width = parseInt(layoutMatch[1]);
                        height = parseInt(layoutMatch[2]);
                    }
                    
                    // 提取坐标信息 - 格式可能是 "(570, 400)"
                    let x = 0, y = 0;
                    const coordText = cells[2];
                    const coordMatch = coordText.match(/\(?\s*(\d+)\s*,\s*(\d+)\s*\)?/);
                    if (coordMatch) {
                        x = parseInt(coordMatch[1]);
                        y = parseInt(coordMatch[2]);
                    }
                    
                    // 提取对应组件信息
                    const component = cells.length >= 4 ? cells[3] : '';
                    
                    if (width > 0 && height > 0) {
                        // 组合成标准坐标格式(x,y,w,h)
                        const coordinates = `(${x},${y},${width},${height})`;
                        
                        result.push({
                            description: componentType,
                            coordinates,
                            component,
                            width,
                            height,
                            x,
                            y
                        });
                    }
                }
            } else if (isCustomFormat || line.includes('组件类型') && line.includes('组件布局') && line.includes('坐标') && line.includes('对应组件')) {
                // 处理用户自定义格式
                console.log("检测到用户自定义格式:", line);
                
                // 解析组件类型
                let componentType = '';
                const typeMatch = line.match(/组件类型\d+\.([^，,]+)/);
                if (typeMatch) {
                    componentType = typeMatch[1].trim();
                }
                
                // 解析组件布局(宽高)
                let width = 0, height = 0;
                const layoutMatch = line.match(/组件布局[：:]\s*\(\s*w\s*=\s*(\d+)\s*,\s*h\s*=\s*(\d+)\s*\)/);
                if (layoutMatch) {
                    width = parseInt(layoutMatch[1]);
                    height = parseInt(layoutMatch[2]);
                }
                
                // 解析坐标(x,y)
                let x = 0, y = 0;
                const coordMatch = line.match(/坐标[：:]\s*\(\s*x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)\s*\)/);
                if (coordMatch) {
                    x = parseInt(coordMatch[1]);
                    y = parseInt(coordMatch[2]);
                }
                
                // 解析对应组件
                let component = '';
                const componentMatch = line.match(/对应组件\s*=\s*([^，,]+)/);
                if (componentMatch) {
                    component = componentMatch[1].trim();
                }
                
                if (width > 0 && height > 0) {
                    // 组合成标准坐标格式(x,y,w,h)
                    const coordinates = `(${x},${y},${width},${height})`;
                    
                    result.push({
                        description: componentType,
                        coordinates,
                        component,
                        width,
                        height,
                        x,
                        y
                    });
                    
                    console.log("解析结果:", {
                        description: componentType,
                        coordinates,
                        component,
                        width,
                        height,
                        x, 
                        y
                    });
                }
                
            } else if (isMarkdownTable) {
                // Markdown表格格式处理
                // 跳过表头或分隔行
                if (line.startsWith('|') && !line.includes('---') && 
                    !line.includes('组件类型') && !line.includes('描述') && !line.includes('坐标范围')) {
                    // 提取单元格内容
                    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
                    
                    if (cells.length >= 2) {
                        // 提取区块描述和坐标范围
                        const description = cells[0].replace(/\*\*/g, '').trim(); // 去除加粗标记**
                        
                        // 尝试解析不同格式的布局和坐标
                        let width = 0, height = 0, x = 0, y = 0;
                        
                        // 从第二列尝试解析宽高 (格式如: 1920×60)
                        if (cells.length >= 2) {
                            const layoutText = cells[1];
                            const layoutMatch = layoutText.match(/(\d+)[×*xX](\d+)/);
                            if (layoutMatch) {
                                width = parseInt(layoutMatch[1]);
                                height = parseInt(layoutMatch[2]);
                                console.log(`解析布局: ${width}×${height}`);
                            }
                        }
                        
                        // 从第三列尝试解析坐标 (格式如: 0,0 或 380,100)
                        if (cells.length >= 3) {
                            const coordText = cells[2];
                            const coordMatch = coordText.match(/(\d+)\s*,\s*(\d+)/);
                            if (coordMatch) {
                                x = parseInt(coordMatch[1]);
                                y = parseInt(coordMatch[2]);
                                console.log(`解析坐标: ${x},${y}`);
                            }
                        }
                        
                        // 提取组件名称（从第四列，如果有的话）
                        const component = cells.length >= 4 ? cells[3] : '';
                        
                        // 如果成功解析到宽高和坐标
                        if (width > 0 && height > 0 && (x >= 0 && y >= 0)) {
                            // 组合成标准坐标格式(x,y,w,h)
                            const coordinates = `(${x},${y},${width},${height})`;
                            
                            result.push({
                                description,
                                coordinates,
                                component,
                                x,
                                y, 
                                width,
                                height
                            });
                            
                            console.log(`添加标注: ${description}, 位置(${x},${y}), 尺寸(${width}x${height}), 组件: ${component}`);
                        } else {
                            console.warn(`解析失败: ${line}`);
                        }
                    }
                }
            } else if (isTabSeparated) {
                // 制表符分隔格式处理
                const cells = line.split('\t').map(cell => cell.trim());
                
                if (isFourColumnFormat && cells.length >= 4 && i >= startIndex) {
                    // 新格式（四列）处理
                    const componentType = cells[0]; // 组件类型
                    const layoutInfo = cells[1];    // 组件布局(w,h)
                    const positionInfo = cells[2];  // 坐标范围(x,y)
                    const antComponent = cells[3];  // 对应Ant组件
                    
                    // 解析宽高信息
                    const layoutMatch = layoutInfo.match(/\((\d+),(\d+)\)/);
                    // 解析坐标信息
                    const positionMatch = positionInfo.match(/\((\d+),(\d+)\)/);
                    
                    if (layoutMatch && positionMatch) {
                        const w = parseInt(layoutMatch[1]);
                        const h = parseInt(layoutMatch[2]);
                        const x = parseInt(positionMatch[1]);
                        const y = parseInt(positionMatch[2]);
                        
                        // 组合成标准坐标格式
                        const coordinates = `(${x},${y},${w},${h})`;
                        
                        result.push({
                            description: componentType,
                            coordinates,
                            component: antComponent,
                            width: w,
                            height: h,
                            x,
                            y
                        });
                    } else if (cells.length >= 2) {
                        // 如果解析失败，回退到标准三列格式处理
                        const description = cells[0];
                        const coordinates = layoutInfo; // 可能不是有效的坐标格式，但仍尝试处理
                        const component = cells.length >= 3 ? cells[2] : '';
                        
                        // 尝试从坐标中提取x,y,width,height
                        let x = 0, y = 0, width = 0, height = 0;
                        const coordMatch = coordinates.match(/\((\d+),(\d+),(\d+),(\d+)\)/);
                        if (coordMatch) {
                            x = parseInt(coordMatch[1]);
                            y = parseInt(coordMatch[2]);
                            width = parseInt(coordMatch[3]);
                            height = parseInt(coordMatch[4]);
                        }
                        
                        result.push({
                            description,
                            coordinates,
                            component,
                            x,
                            y,
                            width, 
                            height
                        });
                    }
                } else if (cells.length >= 2 && i >= startIndex) {
                    // 标准三列格式处理
                    const description = cells[0];
                    const coordinates = cells[1];
                    const component = cells.length >= 3 ? cells[2] : '';
                    
                    // 尝试从坐标中提取x,y,width,height
                    let x = 0, y = 0, width = 0, height = 0;
                    const coordMatch = coordinates.match(/\((\d+),(\d+),(\d+),(\d+)\)/);
                    if (coordMatch) {
                        x = parseInt(coordMatch[1]);
                        y = parseInt(coordMatch[2]);
                        width = parseInt(coordMatch[3]);
                        height = parseInt(coordMatch[4]);
                    }
                    
                    result.push({
                        description,
                        coordinates,
                        component,
                        x,
                        y,
                        width,
                        height
                    });
                }
            } else {
                // 尝试处理简单的不带分隔符的格式
                // 假设数据格式为：description coordinates [component]
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                    let coordinatesIndex = -1;
                    let coordinates = '';
                    let description = '';
                    let component = '';
                    
                    // 检查是否是CSS属性格式
                    if (line.includes('width:') && line.includes('height:') && 
                        (line.includes('top:') || line.includes('left:'))) {
                        
                        // CSS属性格式处理
                        // 尝试找到宽度、高度、顶部和左侧位置的值
                        const widthMatch = line.match(/width\s*:\s*(\d+)(?:px)?/i);
                        const heightMatch = line.match(/height\s*:\s*(\d+)(?:px)?/i);
                        const topMatch = line.match(/top\s*:\s*(\d+)(?:px)?/i);
                        const leftMatch = line.match(/left\s*:\s*(\d+)(?:px)?/i);
                        
                        if (widthMatch && heightMatch && topMatch && leftMatch) {
                            const width = parseInt(widthMatch[1]);
                            const height = parseInt(heightMatch[1]);
                            const top = parseInt(topMatch[1]);
                            const left = parseInt(leftMatch[1]);
                            
                            // 创建坐标字符串
                            coordinates = `(${left},${top},${width},${height})`;
                            coordinates += ' [CSS]'; // 添加标记，指示这是CSS属性格式
                            
                            // 提取描述和组件
                            let beforeCss = '';
                            let afterCss = '';
                            
                            // 查找第一个CSS属性开始位置
                            const cssStartIndex = Math.min(
                                line.indexOf('width:') === -1 ? Infinity : line.indexOf('width:'),
                                line.indexOf('height:') === -1 ? Infinity : line.indexOf('height:'),
                                line.indexOf('top:') === -1 ? Infinity : line.indexOf('top:'),
                                line.indexOf('left:') === -1 ? Infinity : line.indexOf('left:')
                            );
                            
                            // 查找最后一个CSS属性结束位置
                            let cssEndIndex = -1;
                            const cssProps = ['width', 'height', 'top', 'left'];
                            
                            for (const prop of cssProps) {
                                const propIndex = line.indexOf(`${prop}:`);
                                if (propIndex !== -1) {
                                    // 查找该属性后的分号
                                    const semiIndex = line.indexOf(';', propIndex);
                                    if (semiIndex !== -1 && semiIndex > cssEndIndex) {
                                        cssEndIndex = semiIndex;
                                    }
                                }
                            }
                            
                            if (cssStartIndex !== Infinity && cssEndIndex !== -1) {
                                beforeCss = line.substring(0, cssStartIndex).trim();
                                afterCss = line.substring(cssEndIndex + 1).trim();
                            } else {
                                beforeCss = 'CSS元素';
                            }
                            
                            description = beforeCss || 'CSS元素';
                            component = afterCss || '';
                            
                            result.push({
                                description,
                                coordinates,
                                component,
                                x: left,
                                y: top,
                                width,
                                height
                            });
                            
                            continue; // 跳过下面的处理
                        }
                    }
                    
                    // 找到坐标部分
                    for (let j = 0; j < parts.length; j++) {
                        if (parts[j].match(/[\[\(].*[\]\)]/)) {
                            coordinatesIndex = j;
                            break;
                        }
                    }
                    
                    if (coordinatesIndex >= 0) {
                        description = parts.slice(0, coordinatesIndex).join(' ');
                        coordinates = parts[coordinatesIndex];
                        component = parts.slice(coordinatesIndex + 1).join(' ');
                        
                        // 尝试从坐标中提取x,y,width,height
                        let x = 0, y = 0, width = 0, height = 0;
                        const coordMatch = coordinates.match(/\((\d+),(\d+),(\d+),(\d+)\)/);
                        if (coordMatch) {
                            x = parseInt(coordMatch[1]);
                            y = parseInt(coordMatch[2]);
                            width = parseInt(coordMatch[3]);
                            height = parseInt(coordMatch[4]);
                        }
                        
                        result.push({
                            description,
                            coordinates,
                            component,
                            x,
                            y,
                            width,
                            height
                        });
                    }
                }
            }
        }
        
        return result;
    }
    
    // 检查坐标是否在图片范围内
    function checkCoordinatesInBounds(x, y, width, height) {
        const canvas = document.getElementById('imageCanvas');
        if (!canvas) return false;
        
        // 获取画布尺寸
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // 检查坐标和尺寸是否在画布范围内
        return x >= 0 && y >= 0 && 
               (x + width) <= canvasWidth && 
               (y + height) <= canvasHeight;
    }
    
    // 处理批量输入按钮点击事件
    document.getElementById('processBatch').addEventListener('click', async function() {
        // 检查是否有图片
        if (!originalImage) {
            alert('请先上传图片!');
            return;
        }
        
        // 获取批量输入的文本
        const batchText = document.getElementById('batchInput').value.trim();
        if (!batchText) {
            alert('请输入批量标注数据!');
            return;
        }
        
        // 创建加载指示器
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在处理输入数据中...</div>
        `;
        document.body.appendChild(loadingIndicator);
        
        try {
            console.log("开始处理批量输入");
            // 尝试解析输入数据
            let parsedAnnotations = [];
            
            // 首先尝试使用AI解析
            try {
                parsedAnnotations = await processWithDeepSeek(batchText);
                console.log("AI解析成功:", parsedAnnotations);
            } catch (error) {
                console.error("AI解析失败:", error);
                
                // 如果AI解析失败，尝试使用标准解析方法
                try {
                    parsedAnnotations = parseTableData(batchText);
                    console.log("标准解析成功:", parsedAnnotations);
                } catch (e) {
                    console.error("标准解析失败:", e);
                    
                    // 如果标准解析也失败，尝试使用本地备用解析
                    try {
                        parsedAnnotations = fallbackProcessing(batchText);
                        console.log("本地备用解析成功:", parsedAnnotations);
                    } catch (e2) {
                        console.error("本地备用解析失败:", e2);
                        throw new Error("无法解析输入数据，请检查格式是否正确");
                    }
                }
            }
            
            if (parsedAnnotations.length === 0) {
                alert('未能解析出有效的标注数据，请检查输入格式');
                document.body.removeChild(loadingIndicator);
                return;
            }
            
            // 显示解析结果列表供用户确认
            showParseResultsList(parsedAnnotations);
            
        } catch (error) {
            console.error('处理输入数据时出错:', error);
            alert('处理输入数据时出错: ' + error.message);
        } finally {
            // 移除加载指示器
            if (document.getElementById('loadingIndicator')) {
                document.body.removeChild(loadingIndicator);
            }
        }
    });
    
    // 显示解析结果列表，允许用户修改或确认
    function showParseResultsList(parsedAnnotations) {
        // 检查是否已存在结果列表，如果存在则移除
        const existingList = document.getElementById('parseResultsList');
        if (existingList) {
            existingList.remove();
        }
        
        // 创建解析结果容器
        const resultContainer = document.createElement('div');
        resultContainer.id = 'parseResultsList';
        resultContainer.className = 'parse-results-container';
        
        // 创建标题和操作按钮区域
        const headerDiv = document.createElement('div');
        headerDiv.className = 'parse-results-header';
        headerDiv.innerHTML = `
            <h3>AI解析结果 (共 ${parsedAnnotations.length} 项)</h3>
            <div class="parse-results-actions">
                <button id="applyAllAnnotations" class="arco-btn arco-btn-primary">应用全部</button>
                <button id="cancelParseResults" class="arco-btn arco-btn-secondary">取消</button>
            </div>
        `;
        resultContainer.appendChild(headerDiv);
        
        // 创建结果列表
        const resultsList = document.createElement('div');
        resultsList.className = 'parse-results-list';
        
        // 添加每个解析结果项
        parsedAnnotations.forEach((annotation, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'parse-result-item';
            resultItem.setAttribute('data-index', index);
            
            // 基本信息区域
            const infoSection = document.createElement('div');
            infoSection.className = 'parse-result-info';
            
            // 描述字段
            const descriptionDiv = document.createElement('div');
            descriptionDiv.className = 'parse-result-field';
            descriptionDiv.innerHTML = `
                <label>描述:</label>
                <input type="text" class="parse-result-description" value="${annotation.description || '未命名'}" data-field="description">
            `;
            infoSection.appendChild(descriptionDiv);
            
            // 坐标字段（x，y，宽度，高度）
            const coordsDiv = document.createElement('div');
            coordsDiv.className = 'parse-result-field parse-result-coords';
            coordsDiv.innerHTML = `
                <div>
                    <label>X:</label>
                    <input type="number" class="parse-result-x" value="${annotation.x}" data-field="x" min="0">
                </div>
                <div>
                    <label>Y:</label>
                    <input type="number" class="parse-result-y" value="${annotation.y}" data-field="y" min="0">
                </div>
                <div>
                    <label>宽度:</label>
                    <input type="number" class="parse-result-width" value="${annotation.width}" data-field="width" min="1">
                </div>
                <div>
                    <label>高度:</label>
                    <input type="number" class="parse-result-height" value="${annotation.height}" data-field="height" min="1">
                </div>
            `;
            infoSection.appendChild(coordsDiv);
            
            // 组件信息
            const componentDiv = document.createElement('div');
            componentDiv.className = 'parse-result-field';
            componentDiv.innerHTML = `
                <label>组件:</label>
                <input type="text" class="parse-result-component" value="${annotation.component || ''}" data-field="component">
            `;
            infoSection.appendChild(componentDiv);
            
            // 操作按钮区域
            const actionsSection = document.createElement('div');
            actionsSection.className = 'parse-result-actions';
            actionsSection.innerHTML = `
                <button class="arco-btn arco-btn-primary apply-single-annotation" data-index="${index}">应用</button>
                <button class="arco-btn arco-btn-secondary delete-parse-result" data-index="${index}">删除</button>
            `;
            
            // 组合所有元素
            resultItem.appendChild(infoSection);
            resultItem.appendChild(actionsSection);
            resultsList.appendChild(resultItem);
        });
        
        resultContainer.appendChild(resultsList);
        document.body.appendChild(resultContainer);
        
        // 添加事件监听
        // 单个应用按钮
        document.querySelectorAll('.apply-single-annotation').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const resultItem = document.querySelector(`.parse-result-item[data-index="${index}"]`);
                
                // 获取更新后的值
                const description = resultItem.querySelector('.parse-result-description').value;
                const x = parseInt(resultItem.querySelector('.parse-result-x').value);
                const y = parseInt(resultItem.querySelector('.parse-result-y').value);
                const width = parseInt(resultItem.querySelector('.parse-result-width').value);
                const height = parseInt(resultItem.querySelector('.parse-result-height').value);
                const component = resultItem.querySelector('.parse-result-component').value;
                
                // 检查坐标是否在图像范围内
                if (!checkCoordinatesInBounds(x, y, width, height)) {
                    alert(`坐标 (${x},${y}) 宽度${width} 高度${height} 超出图片范围!`);
                    return;
                }
                
                // 添加标注
                const success = addAnnotationFromCoords(x, y, x + width, y + height, description, component);
                
                if (success) {
                    // 移除该项
                    resultItem.remove();
                    
                    // 如果列表为空，移除整个容器
                    if (document.querySelectorAll('.parse-result-item').length === 0) {
                        document.getElementById('parseResultsList').remove();
                    }
                }
            });
        });
        
        // 删除单个结果按钮
        document.querySelectorAll('.delete-parse-result').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const resultItem = document.querySelector(`.parse-result-item[data-index="${index}"]`);
                resultItem.remove();
                
                // 如果列表为空，移除整个容器
                if (document.querySelectorAll('.parse-result-item').length === 0) {
                    document.getElementById('parseResultsList').remove();
                }
            });
        });
        
        // 应用全部按钮
        document.getElementById('applyAllAnnotations').addEventListener('click', function() {
            let appliedCount = 0;
            let hasError = false;
            
            // 获取所有当前存在的结果项
            const resultItems = document.querySelectorAll('.parse-result-item');
            
            resultItems.forEach(item => {
                // 获取更新后的值
                const description = item.querySelector('.parse-result-description').value;
                const x = parseInt(item.querySelector('.parse-result-x').value);
                const y = parseInt(item.querySelector('.parse-result-y').value);
                const width = parseInt(item.querySelector('.parse-result-width').value);
                const height = parseInt(item.querySelector('.parse-result-height').value);
                const component = item.querySelector('.parse-result-component').value;
                
                // 检查坐标是否在图像范围内
                if (!checkCoordinatesInBounds(x, y, width, height)) {
                    alert(`坐标 (${x},${y}) 宽度${width} 高度${height} 超出图片范围!`);
                    hasError = true;
                    return;
                }
                
                // 添加标注
                const success = addAnnotationFromCoords(x, y, x + width, y + height, description, component);
                
                if (success) {
                    appliedCount++;
                } else {
                    hasError = true;
                }
            });
            
            // 移除结果列表
            document.getElementById('parseResultsList').remove();
            
            // 提示用户
            if (!hasError) {
                document.getElementById('batchInput').value = '';
                alert(`成功添加了 ${appliedCount} 个标注`);
            }
        });
        
        // 取消按钮
        document.getElementById('cancelParseResults').addEventListener('click', function() {
            document.getElementById('parseResultsList').remove();
        });
    }

    // 将DeepSeek API设置为第一优先级解析方法
    async function processWithDeepSeek(inputText) {
        const DEEPSEEK_API_KEY = 'sk-6053ba2bfbab4be0ba38f04141c70a08';
        const API_URL = 'https://api.deepseek.com/chat/completions';
        
        const prompt = `
        请分析下面的组件描述，并将其整理成标准格式。提取以下信息：
        1. 组件类型
        2. 组件布局（宽度和高度，以像素为单位）
        3. 坐标位置（X和Y坐标，以像素为单位）
        4. 对应的ant组件（如果有）

        只需要提供结构化数据，不需要解释。使用以下JSON格式返回：
        [
          {
            "description": "组件类型",
            "width": 宽度数值,
            "height": 高度数值,
            "x": X坐标数值,
            "y": Y坐标数值,
            "component": "对应ant组件"
          },
          ...
        ]

        以下是输入内容：
        ${inputText}
        `;
        
        try {
            console.log("发送到DeepSeek的提示:", prompt);
            
            // 首先尝试不使用代理
            let response;
            try {
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [
                            {
                                "role": "system",
                                "content": "You are a helpful assistant."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        stream: false,
                        temperature: 0.1
                    })
                });
            } catch (error) {
                console.log("直接访问API失败，尝试使用代理...", error);
                // 如果直接访问失败，尝试使用代理
                const proxyUrl = 'https://corsproxy.io/?';
                response = await fetch(proxyUrl + encodeURIComponent(API_URL), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [
                            {
                                "role": "system",
                                "content": "You are a helpful assistant."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        stream: false,
                        temperature: 0.1
                    })
                });
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('DeepSeek API错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(`DeepSeek API请求失败: ${errorData.error?.message || response.statusText}`);
                } catch (e) {
                    throw new Error(`DeepSeek API请求失败: ${response.status} ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            console.log("DeepSeek API响应:", data);
            
            // 提取AI响应中的JSON数据
            const content = data.choices[0].message.content;
            let jsonData;
            
            try {
                // 尝试直接解析整个内容为JSON
                jsonData = JSON.parse(content);
            } catch (e) {
                console.log("直接解析JSON失败，尝试从文本中提取JSON部分");
                // 如果失败，尝试从文本中提取JSON部分
                const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    jsonData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('无法从AI响应中提取JSON数据');
                }
            }
            
            // 转换为应用程序使用的格式
            return jsonData.map(item => ({
                description: item.description,
                coordinates: `(${item.x},${item.y},${item.width},${item.height})`,
                component: item.component,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height
            }));
            
        } catch (error) {
            console.error('DeepSeek API处理失败:', error);
            throw new Error('AI处理失败: ' + error.message);
        }
    }
    
    // 增强的Markdown表格解析函数 - 专门处理复杂表格格式
    function parseEnhancedMarkdownTable(text) {
        console.log("使用增强的Markdown表格解析功能");
        const result = [];
        
        // 分割为行
        const lines = text.split('\n').filter(line => line.trim());
        
        // 检查是否是Markdown表格
        if (!lines.some(line => line.includes('|'))) {
            console.log("不是Markdown表格格式");
            return [];
        }
        
        // 找到表头行索引
        let headerIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if ((lines[i].includes('组件') || lines[i].includes('类型')) && 
                (lines[i].includes('布局') || lines[i].includes('W') || lines[i].includes('H')) && 
                (lines[i].includes('坐标') || lines[i].includes('X') || lines[i].includes('Y'))) {
                headerIndex = i;
                break;
            }
        }
        
        if (headerIndex === -1) {
            console.log("未找到表头行");
            return [];
        }
        
        // 解析表头，确定各列的内容类型
        const headerCells = lines[headerIndex].split('|')
            .map(cell => cell.trim())
            .filter(cell => cell);
            
        console.log("表头:", headerCells);
        
        // 定位关键列的索引
        let typeColIndex = -1;
        let layoutColIndex = -1;
        let coordColIndex = -1;
        let compColIndex = -1;
        
        for (let i = 0; i < headerCells.length; i++) {
            const cell = headerCells[i].toLowerCase();
            if (cell.includes('组件类型') || cell.includes('类型') || cell.includes('组件')) {
                typeColIndex = i;
            } else if (cell.includes('布局') || (cell.includes('w') && cell.includes('h'))) {
                layoutColIndex = i;
            } else if (cell.includes('坐标') || (cell.includes('x') && cell.includes('y'))) {
                coordColIndex = i;
            } else if (cell.includes('ant') || cell.includes('组件') || cell.includes('对应')) {
                compColIndex = i;
            }
        }
        
        console.log(`列索引: 类型=${typeColIndex}, 布局=${layoutColIndex}, 坐标=${coordColIndex}, 组件=${compColIndex}`);
        
        // 如果没有找到必要的列，尝试智能推断
        if (typeColIndex === -1 && layoutColIndex === -1 && coordColIndex === -1) {
            console.log("尝试智能推断列类型");
            // 假设第一列是组件类型，第二列是布局，第三列是坐标
            if (headerCells.length >= 3) {
                typeColIndex = 0;
                layoutColIndex = 1;
                coordColIndex = 2;
                if (headerCells.length >= 4) {
                    compColIndex = 3;
                }
            }
        }
        
        // 跳过表头和分隔行
        let dataStartIndex = headerIndex + 1;
        if (dataStartIndex < lines.length && lines[dataStartIndex].includes('---')) {
            dataStartIndex++;
        }
        
        // 处理数据行
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.includes('---')) continue;
            
            // 分割单元格
            const cells = line.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell);
                
            if (cells.length < 2) continue;
            
            let description = '';
            let width = 0, height = 0;
            let x = 0, y = 0;
            let component = '';
            
            // 提取组件类型/描述
            if (typeColIndex >= 0 && typeColIndex < cells.length) {
                description = cells[typeColIndex].replace(/\*\*/g, '').trim();
            }
            
            // 提取布局信息 (宽高)
            if (layoutColIndex >= 0 && layoutColIndex < cells.length) {
                const layoutText = cells[layoutColIndex];
                // 尝试匹配不同格式: 1920×60, 1920*60, 1920x60, W:1920,H:60 等
                const layoutMatch = layoutText.match(/(\d+)[×*xX](\d+)/) || 
                                   layoutText.match(/[Ww]\s*[:：]?\s*(\d+)\s*,\s*[Hh]\s*[:：]?\s*(\d+)/i) ||
                                   layoutText.match(/宽\s*[:：]?\s*(\d+)\s*,?\s*高\s*[:：]?\s*(\d+)/i) ||
                                   layoutText.match(/(\d+)\s*[×*xX\s]\s*(\d+)/);
                
                if (layoutMatch) {
                    width = parseInt(layoutMatch[1]);
                    height = parseInt(layoutMatch[2]);
                }
            }
            
            // 提取坐标信息
            if (coordColIndex >= 0 && coordColIndex < cells.length) {
                const coordText = cells[coordColIndex];
                // 尝试匹配不同格式: 0,0 或 X:0,Y:0 或 (0,0) 等
                const coordMatch = coordText.match(/(\d+)\s*,\s*(\d+)/) || 
                                  coordText.match(/[Xx]\s*[:：]?\s*(\d+)\s*,\s*[Yy]\s*[:：]?\s*(\d+)/i) ||
                                  coordText.match(/\(\s*(\d+)\s*,\s*(\d+)\s*\)/) ||
                                  coordText.match(/左\s*[:：]?\s*(\d+)\s*,?\s*上\s*[:：]?\s*(\d+)/i);
                
                if (coordMatch) {
                    x = parseInt(coordMatch[1]);
                    y = parseInt(coordMatch[2]);
                }
            }
            
            // 提取组件信息
            if (compColIndex >= 0 && compColIndex < cells.length) {
                component = cells[compColIndex].trim();
            }
            
            // 如果能够提取到必要信息，则添加到结果中
            if (width > 0 && height > 0) {
                result.push({
                    description: description || '未命名组件',
                    coordinates: `(${x},${y},${width},${height})`,
                    component,
                    x,
                    y,
                    width,
                    height
                });
                
                console.log(`成功解析: ${description}, 位置(${x},${y}), 尺寸(${width}x${height}), 组件: ${component}`);
            }
        }
        
        return result;
    }
    
    // 备用解析方案，当API无法访问时使用
    function fallbackProcessing(inputText) {
        console.log("使用本地备用解析方案");
        const result = [];
        
        // 尝试从文本中提取组件信息
        const lines = inputText.split('\n');
        let currentComponent = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // 检查是否是新组件的开始
            if (!line.startsWith('组件') && !line.startsWith('坐标') && !line.startsWith('对应')) {
                // 保存之前的组件（如果有）
                if (currentComponent && currentComponent.width > 0 && currentComponent.height > 0) {
                    result.push({
                        description: currentComponent.title || currentComponent.type,
                        coordinates: `(${currentComponent.x},${currentComponent.y},${currentComponent.width},${currentComponent.height})`,
                        component: currentComponent.component,
                        x: currentComponent.x,
                        y: currentComponent.y,
                        width: currentComponent.width,
                        height: currentComponent.height
                    });
                }
                
                // 创建新组件
                currentComponent = {
                    title: line,
                    type: '',
                    width: 0,
                    height: 0,
                    x: 0,
                    y: 0,
                    component: ''
                };
            } else if (line.includes('组件类型')) {
                if (currentComponent) {
                    currentComponent.type = line.split(/[:：]/)[1].trim();
                }
            } else if (line.includes('组件布局')) {
                if (currentComponent) {
                    const match = line.match(/W\s*[:：]\s*(\d+)\s*,\s*H\s*[:：]\s*(\d+)/i);
                    if (match) {
                        currentComponent.width = parseInt(match[1]);
                        currentComponent.height = parseInt(match[2]);
                    }
                }
            } else if (line.includes('坐标')) {
                if (currentComponent) {
                    const match = line.match(/X\s*[:：]\s*(\d+)\s*,\s*Y\s*[:：]\s*(\d+)/i);
                    if (match) {
                        currentComponent.x = parseInt(match[1]);
                        currentComponent.y = parseInt(match[2]);
                    }
                }
            } else if (line.includes('对应')) {
                if (currentComponent) {
                    currentComponent.component = line.split(/[:：]/)[1].trim();
                }
            }
        }
        
        // 添加最后一个组件
        if (currentComponent && currentComponent.width > 0 && currentComponent.height > 0) {
            result.push({
                description: currentComponent.title || currentComponent.type,
                coordinates: `(${currentComponent.x},${currentComponent.y},${currentComponent.width},${currentComponent.height})`,
                component: currentComponent.component,
                x: currentComponent.x,
                y: currentComponent.y,
                width: currentComponent.width,
                height: currentComponent.height
            });
        }
        
        console.log("本地解析结果:", result);
        return result;
    }
    
    // 添加导出标注功能
    const exportAnnotationsBtn = document.getElementById('exportAnnotations');
    
    exportAnnotationsBtn.addEventListener('click', function() {
        if (annotations.length === 0) {
            alert('没有标注可导出!');
            return;
        }
        
        // 准备导出数据
        const exportData = annotations.map(ann => {
            return {
                coordinates: {
                    x1: ann.x1,
                    y1: ann.y1,
                    x2: ann.x2,
                    y2: ann.y2,
                    width: ann.x2 - ann.x1,
                    height: ann.y2 - ann.y1
                },
                label: ann.label || '',
                component: ann.component || '',
                color: ann.color
            };
        });
        
        // 创建下载链接
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = 'annotations_' + new Date().toISOString().slice(0,19).replace(/:/g,'-') + '.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.style.display = 'none';
        
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    });
    
    // 初始化画布
    function initCanvas() {
        // 设置canvas初始状态
        imageCanvas.width = currentResolution.width;
        imageCanvas.height = currentResolution.height;
        
        // 更新缩放UI
        updateZoomUI();
        
        // 绘制提示文字
        drawImage();
        
        // 初始状态下禁用自动应用按钮
        const autoApplyBtn = document.getElementById('autoApplyResolution');
        if (autoApplyBtn) {
            autoApplyBtn.disabled = true;
        }
    }
    
    // 页面载入时禁用自定义分辨率输入框
    customWidthInput.disabled = true;
    customHeightInput.disabled = true;
    customWidthInput.value = "1920";
    customHeightInput.value = "1080";
    
    // 存储拖拽状态
    let isDragging = false;
    let isResizing = false;
    let selectedAnnotation = null;
    let selectedHandle = '';
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    // 检查鼠标是否在调整手柄上
    function getResizeHandle(x, y, annotation) {
        const handles = [
            { name: 'nw', x: annotation.x1, y: annotation.y1 },
            { name: 'ne', x: annotation.x2, y: annotation.y1 },
            { name: 'sw', x: annotation.x1, y: annotation.y2 },
            { name: 'se', x: annotation.x2, y: annotation.y2 }
        ];

        const handleSize = 6;
        for (const handle of handles) {
            if (Math.abs(x - handle.x) <= handleSize && Math.abs(y - handle.y) <= handleSize) {
                return handle.name;
            }
        }
        return '';
    }

    // 检查鼠标是否在标注区域内
    function isInsideAnnotation(x, y, annotation) {
        return x >= annotation.x1 && x <= annotation.x2 && 
               y >= annotation.y1 && y <= annotation.y2;
    }

    // 获取鼠标在画布上的坐标
    function getCanvasCoordinates(e) {
        const canvas = document.getElementById('imageCanvas');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // 鼠标按下事件
    imageCanvas.addEventListener('mousedown', function(e) {
        const coords = getCanvasCoordinates(e);
        const x = coords.x;
        const y = coords.y;

        // 检查是否点击了某个标注
        for (let i = annotations.length - 1; i >= 0; i--) {
            const annotation = annotations[i];
            const handle = getResizeHandle(x, y, annotation);

            if (handle) {
                // 点击了调整手柄
                isResizing = true;
                selectedAnnotation = annotation;
                selectedHandle = handle;
                startX = x;
                startY = y;
                lastX = x;
                lastY = y;
                break;
            } else if (isInsideAnnotation(x, y, annotation)) {
                // 点击了标注区域
                isDragging = true;
                selectedAnnotation = annotation;
                startX = x;
                startY = y;
                lastX = x;
                lastY = y;
                break;
            }
        }
    });

    // 鼠标移动事件
    imageCanvas.addEventListener('mousemove', function(e) {
        const coords = getCanvasCoordinates(e);
        const x = coords.x;
        const y = coords.y;

        if (isDragging && selectedAnnotation) {
            // 计算移动距离
            const dx = x - lastX;
            const dy = y - lastY;

            // 检查移动后是否会超出画布范围
            const newX1 = selectedAnnotation.x1 + dx;
            const newY1 = selectedAnnotation.y1 + dy;
            const newX2 = selectedAnnotation.x2 + dx;
            const newY2 = selectedAnnotation.y2 + dy;

            if (newX1 >= 0 && newX2 <= imageCanvas.width && 
                newY1 >= 0 && newY2 <= imageCanvas.height) {
                // 更新标注位置
                selectedAnnotation.x1 = newX1;
                selectedAnnotation.y1 = newY1;
                selectedAnnotation.x2 = newX2;
                selectedAnnotation.y2 = newY2;
                drawImage();
            }

            lastX = x;
            lastY = y;
        } else if (isResizing && selectedAnnotation) {
            // 根据不同的调整手柄更新标注大小
            switch (selectedHandle) {
                case 'nw':
                    if (x < selectedAnnotation.x2 && y < selectedAnnotation.y2) {
                        selectedAnnotation.x1 = Math.max(0, x);
                        selectedAnnotation.y1 = Math.max(0, y);
                    }
                    break;
                case 'ne':
                    if (x > selectedAnnotation.x1 && y < selectedAnnotation.y2) {
                        selectedAnnotation.x2 = Math.min(imageCanvas.width, x);
                        selectedAnnotation.y1 = Math.max(0, y);
                    }
                    break;
                case 'sw':
                    if (x < selectedAnnotation.x2 && y > selectedAnnotation.y1) {
                        selectedAnnotation.x1 = Math.max(0, x);
                        selectedAnnotation.y2 = Math.min(imageCanvas.height, y);
                    }
                    break;
                case 'se':
                    if (x > selectedAnnotation.x1 && y > selectedAnnotation.y1) {
                        selectedAnnotation.x2 = Math.min(imageCanvas.width, x);
                        selectedAnnotation.y2 = Math.min(imageCanvas.height, y);
                    }
                    break;
            }
            drawImage();
            lastX = x;
            lastY = y;
        } else {
            // 更新鼠标样式
            let cursorStyle = 'default';
            for (const annotation of annotations) {
                const handle = getResizeHandle(x, y, annotation);
                if (handle) {
                    switch (handle) {
                        case 'nw':
                        case 'se':
                            cursorStyle = 'nwse-resize';
                            break;
                        case 'ne':
                        case 'sw':
                            cursorStyle = 'nesw-resize';
                            break;
                    }
                    break;
                } else if (isInsideAnnotation(x, y, annotation)) {
                    cursorStyle = 'move';
                    break;
                }
            }
            imageCanvas.style.cursor = cursorStyle;
        }
    });

    // 鼠标松开事件
    imageCanvas.addEventListener('mouseup', function() {
        if (isDragging || isResizing) {
            // 更新标注列表
            updateAnnotationList();
        }
        isDragging = false;
        isResizing = false;
        selectedAnnotation = null;
        selectedHandle = '';
    });

    // 鼠标离开画布事件
    imageCanvas.addEventListener('mouseleave', function() {
        isDragging = false;
        isResizing = false;
        selectedAnnotation = null;
        selectedHandle = '';
        imageCanvas.style.cursor = 'default';
    });
    
    // 初始化
    initCanvas();
}); 