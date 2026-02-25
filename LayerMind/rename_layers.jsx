// Photoshop 图层批量重命名和分组脚本
// 功能：根据 CSV 文件重命名图层并自动创建分组（支持内容类型和视觉层级）

function renameLayers() {
    // 获取当前文档
    var doc = app.activeDocument;
    if (!doc) {
        alert("请先打开一个 PSD 文件");
        return;
    }
    
    // 询问用户分组方式
    var groupMethod = prompt(
        "请选择分组方式：\n" +
        "1 - 按内容类型分组（【文字】【素材】等）\n" +
        "2 - 按视觉层级分组（前景层/中景层/背景层）\n" +
        "3 - 混合分组（先按层级，再按类型）",
        "1"
    );
    
    if (groupMethod === null) {
        return;
    }
    
    groupMethod = parseInt(groupMethod);
    if (isNaN(groupMethod) || groupMethod < 1 || groupMethod > 3) {
        groupMethod = 1;
    }
    
    // 构建 CSV 文件路径
    var desktopPath = Folder.desktop;
    var csvPath = desktopPath + "/PS_Layer_Export/rename_list.csv";
    var csvFile = new File(csvPath);
    
    // 检查 CSV 文件是否存在
    if (!csvFile.exists) {
        alert("未找到重命名脚本文件，请先运行 LayerMind 分析图层");
        return;
    }
    
    // 读取 CSV 文件
    var csvContent;
    csvFile.open("r");
    csvContent = csvFile.read();
    csvFile.close();
    
    // 解析 CSV 内容
    var lines = csvContent.split("\n");
    var layerData = [];
    
    // 跳过表头，读取数据行
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.length > 0) {
            var parts = line.split(",");
            if (parts.length >= 3) {
                var layerInfo = {
                    index: parseInt(parts[0]),
                    newName: parts[1],
                    category: parts[2],
                    visualLayer: parts.length >= 4 ? parts[3] : ""
                };
                layerData.push(layerInfo);
            }
        }
    }
    
    if (layerData.length === 0) {
        alert("CSV 文件中没有有效的图层数据");
        return;
    }
    
    // 按图层索引排序
    layerData.sort(function(a, b) {
        return a.index - b.index;
    });
    
    // 存储已创建的图层组
    var layerGroups = {};
    var visualLayerGroups = {};
    
    // 处理每个图层
    var processedCount = 0;
    
    for (var j = 0; j < layerData.length; j++) {
        var info = layerData[j];
        var layerIndex = info.index;
        
        // 检查图层索引是否有效
        if (layerIndex >= 0 && layerIndex < doc.layers.length) {
            var layer = doc.layers[layerIndex];
            
            try {
                // 重命名图层 - 添加分类前缀
                var finalName = info.newName;
                if (info.category && info.category.length > 0) {
                    finalName = info.category + finalName;
                }
                if (finalName && finalName.length > 0) {
                    layer.name = finalName;
                }
                
                // 处理分组
                var targetGroupName = "";
                
                if (groupMethod === 1) {
                    // 按内容类型分组
                    if (info.category && info.category.length > 0) {
                        targetGroupName = info.category;
                    }
                } else if (groupMethod === 2) {
                    // 按视觉层级分组
                    if (info.visualLayer && info.visualLayer.length > 0) {
                        targetGroupName = info.visualLayer;
                    }
                } else if (groupMethod === 3) {
                    // 混合分组（先按层级，再按类型）
                    if (info.visualLayer && info.visualLayer.length > 0 && 
                        info.category && info.category.length > 0) {
                        targetGroupName = info.visualLayer + " - " + info.category;
                    } else if (info.visualLayer && info.visualLayer.length > 0) {
                        targetGroupName = info.visualLayer;
                    } else if (info.category && info.category.length > 0) {
                        targetGroupName = info.category;
                    }
                }
                
                // 如果有分组名称，创建并移动到对应组
                if (targetGroupName && targetGroupName.length > 0) {
                    // 检查是否已存在该分组
                    if (!layerGroups[targetGroupName]) {
                        // 创建新的图层组
                        var newGroup = doc.layerSets.add();
                        newGroup.name = targetGroupName;
                        layerGroups[targetGroupName] = newGroup;
                        // 将新创建的组移到文档顶部
                        newGroup.move(doc, ElementPlacement.PLACEATBEGINNING);
                    }
                    
                    // 将图层移动到对应的图层组
                    var targetGroup = layerGroups[targetGroupName];
                    layer.move(targetGroup, ElementPlacement.PLACEINSIDE);
                }
                
                processedCount++;
                
            } catch (e) {
                // 忽略错误，继续处理下一个图层
                // alert("处理图层时出错: " + e.message);
            }
        }
    }
    
    // 显示处理完成提示
    var methodName = "";
    if (groupMethod === 1) {
        methodName = "内容类型";
    } else if (groupMethod === 2) {
        methodName = "视觉层级";
    } else {
        methodName = "混合（层级+类型）";
    }
    
    alert("图层重命名和分组完成！\n\n" +
          "处理方式：" + methodName + "\n" +
          "共处理 " + processedCount + " 个图层");
}

// 运行脚本
renameLayers();
