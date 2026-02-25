// Photoshop 图层快速检索脚本
// 功能：根据关键词搜索图层并高亮显示

function searchLayers() {
    // 获取当前文档
    var doc = app.activeDocument;
    if (!doc) {
        alert("请先打开一个 PSD 文件");
        return;
    }
    
    // 提示用户输入搜索关键词
    var searchKeyword = prompt("请输入搜索关键词（支持模糊搜索）：", "");
    
    if (searchKeyword === null || searchKeyword.trim() === "") {
        return;
    }
    
    searchKeyword = searchKeyword.trim();
    
    // 存储找到的图层
    var foundLayers = [];
    
    // 递归搜索图层（包括图层组内的图层）
    function searchInLayers(layers, parentPath) {
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var layerName = layer.name;
            var currentPath = parentPath ? parentPath + " > " + layerName : layerName;
            
            // 检查图层名称是否包含关键词（不区分大小写）
            if (layerName.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
                foundLayers.push({
                    layer: layer,
                    name: layerName,
                    path: currentPath,
                    isGroup: layer.typename === "LayerSet"
                });
            }
            
            // 如果是图层组，递归搜索子图层
            if (layer.typename === "LayerSet") {
                searchInLayers(layer.layers, currentPath);
            }
        }
    }
    
    // 开始搜索
    searchInLayers(doc.layers, "");
    
    if (foundLayers.length === 0) {
        alert("未找到包含关键词 \"" + searchKeyword + "\" 的图层");
        return;
    }
    
    // 构建搜索结果列表
    var resultMessage = "找到 " + foundLayers.length + " 个图层：\n\n";
    
    for (var j = 0; j < foundLayers.length; j++) {
        var layerInfo = foundLayers[j];
        var typeLabel = layerInfo.isGroup ? "[组]" : "[图层]";
        resultMessage += (j + 1) + ". " + typeLabel + " " + layerInfo.path + "\n";
    }
    
    resultMessage += "\n点击确定将高亮显示第一个找到的图层，\n并在图层面板中选中它。";
    
    var confirmResult = confirm(resultMessage);
    
    if (confirmResult) {
        // 取消所有选择
        for (var k = 0; k < doc.layers.length; k++) {
            doc.layers[k].selected = false;
        }
        
        // 选中并高亮显示第一个找到的图层
        var firstLayer = foundLayers[0].layer;
        firstLayer.selected = true;
        
        // 如果有多个结果，询问是否需要查看更多
        if (foundLayers.length > 1) {
            var viewMore = confirm("找到多个图层！\n是否需要逐一查看？");
            
            if (viewMore) {
                // 创建一个简单的对话框让用户选择要查看的图层
                var layerNames = [];
                for (var m = 0; m < foundLayers.length; m++) {
                    var info = foundLayers[m];
                    var typeLabel = info.isGroup ? "[组]" : "[图层]";
                    layerNames.push((m + 1) + ". " + typeLabel + " " + info.name);
                }
                
                var selectedIndex = prompt(
                    "请输入要查看的图层编号（1-" + foundLayers.length + "）：\n\n" + layerNames.join("\n"),
                    "1"
                );
                
                if (selectedIndex !== null) {
                    var idx = parseInt(selectedIndex) - 1;
                    if (idx >= 0 && idx < foundLayers.length) {
                        // 取消所有选择
                        for (var n = 0; n < doc.layers.length; n++) {
                            doc.layers[n].selected = false;
                        }
                        
                        // 选中用户选择的图层
                        foundLayers[idx].layer.selected = true;
                        alert("已选中图层：" + foundLayers[idx].path);
                    }
                }
            }
        } else {
            alert("已选中图层：" + foundLayers[0].path);
        }
    }
}

// 运行脚本
searchLayers();
