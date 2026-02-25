// Photoshop 图层批量导出脚本
// 功能：导出当前 PSD 文件的所有可见图层为 PNG 图片

function exportLayers() {
    // 获取当前文档
    var doc = app.activeDocument;
    if (!doc) {
        alert("请先打开一个 PSD 文件");
        return;
    }
    
    // 创建导出文件夹
    var desktopPath = Folder.desktop;  // 获取桌面路径
    var exportFolder = Folder(desktopPath + "/PS_Layer_Export");
    
    // 如果文件夹不存在，创建它
    if (!exportFolder.exists) {
        exportFolder.create();
    }
    
    // 记录导出的图层数量
    var exportedCount = 0;
    
    // 遍历所有图层
    for (var i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];
        
        // 忽略隐藏的图层
        if (!layer.visible) {
            continue;
        }
        
        // 忽略图层组
        if (layer.typename === "LayerSet") {
            continue;
        }
        
        // 保存当前活动文档
            var originalDoc = app.activeDocument;
            
            // 复制图层到新文档
            var tempDoc = app.documents.add(200, 200, doc.resolution, "temp", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
            
            // 重新激活原始文档
            app.activeDocument = originalDoc;
            
            // 复制图层
            layer.duplicate(tempDoc, ElementPlacement.PLACEATEND);
            
            // 激活临时文档
            app.activeDocument = tempDoc;
            tempDoc.activeLayer = tempDoc.layers[tempDoc.layers.length - 1];
        
        try {
            // 获取复制后的图层
            var copiedLayer = tempDoc.activeLayer;
            
            // 计算图层内容的边界
            var bounds = copiedLayer.bounds;
            var layerWidth = bounds[2] - bounds[0];
            var layerHeight = bounds[3] - bounds[1];
            
            // 计算居中位置
            var offsetX = (200 - layerWidth) / 2 - bounds[0];
            var offsetY = (200 - layerHeight) / 2 - bounds[1];
            
            // 移动图层到中心
            var moveAction = new ActionReference();
            moveAction.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            var moveDesc = new ActionDescriptor();
            moveDesc.putReference(charIDToTypeID("null"), moveAction);
            var offsetDesc = new ActionDescriptor();
            offsetDesc.putUnitDouble(charIDToTypeID("H"), charIDToTypeID("Pxl"), offsetX);
            offsetDesc.putUnitDouble(charIDToTypeID("V"), charIDToTypeID("Pxl"), offsetY);
            moveDesc.putObject(charIDToTypeID("T "), charIDToTypeID("Ofst"), offsetDesc);
            executeAction(charIDToTypeID("Mov "), moveDesc, DialogModes.NO);
            
            // 构建导出文件名
            var layerName = layer.name;
            // 替换文件名中的非法字符
            var illegalChars = ["\\", "/", ":", "*", "?", "\"", "<", ">", "|"];
            for (var j = 0; j < illegalChars.length; j++) {
                layerName = layerName.split(illegalChars[j]).join("_");
            }
            var fileName = i + "_" + layerName + ".png";
            var exportPath = exportFolder + "/" + fileName;
            
            // 导出为 PNG
            var pngOptions = new PNGSaveOptions();
            pngOptions.compression = 0;
            pngOptions.interlaced = false;
            
            tempDoc.saveAs(new File(exportPath), pngOptions, true, Extension.LOWERCASE);
            
            exportedCount++;
            
        } catch (e) {
            // 忽略错误，继续处理下一个图层
            // alert("处理图层 " + layer.name + " 时出错: " + e.message);
            // 静默处理错误，避免频繁弹窗
        } finally {
            try {
                // 关闭临时文档，不保存
                if (tempDoc) {
                    tempDoc.close(SaveOptions.DONOTSAVECHANGES);
                }
            } catch (closeError) {
                // 忽略关闭文档时的错误
            }
        }
    }
    
    // 显示导出完成提示
    alert("导出完成，共导出 " + exportedCount + " 个图层");
}

// 运行脚本
exportLayers();