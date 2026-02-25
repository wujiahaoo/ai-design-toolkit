/**
 * 批量重命名图层并自动分组
 * 1. 读取桌面 PS_Layer_Export/rename_list.csv
 * 2. CSV格式：索引,新名,分类标签
 * 3. 按图层索引修改名称（索引为0对应最上面图层）
 * 4. 按分类标签分组（无标签不分组）
 * 5. 分组自动创建，不重复，无标签不移动
 */

// 获取桌面文件夹路径
function getDesktopFolder() {
    return Folder.desktop.fsName;
}

// 解析CSV为数组（UTF8 BOM兼容）
function readCSV(csvFile) {
    var data = [];
    if (!csvFile.exists) return data;
    csvFile.encoding = "UTF8";
    csvFile.lineFeed = "unix";
    csvFile.open("r");
    // 跳过表头
    var isFirst = true;
    while (!csvFile.eof) {
        var line = csvFile.readln();
        if (isFirst) { isFirst = false; continue; }
        // 剔除BOM
        line = line.replace(/^\uFEFF/, "");
        // 用逗号分割，支持引号包裹
        var arr = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (arr && arr.length >= 3) {
            // 去除两侧引号
            arr = arr.map(function(x){return x.replace(/^"|"$/g, "");});
            data.push({index: parseInt(arr[0],10), newName: arr[1], category: arr[2]});
        }
    }
    csvFile.close();
    return data;
}

// 查找或新建组（支持中文分组名分类标签）
function getOrCreateGroup(doc, groupName) {
    for (var i=0; i<doc.layerSets.length; i++) {
        if (doc.layerSets[i].name == groupName)
            return doc.layerSets[i];
    }
    // 新建分组
    var grp = doc.layerSets.add();
    grp.name = groupName;
    return grp;
}

// 主逻辑
(function(){
    // 1. 打开CSV
    var csvPath = getDesktopFolder() + "/PS_Layer_Export/rename_list.csv";
    var csvFile = File(csvPath);
    if (!csvFile.exists) {
        alert("未找到重命名清单: " + csvPath);
        return;
    }
    var doc = app.activeDocument;
    var csvData = readCSV(csvFile);
    if (csvData.length == 0) {
        alert("CSV文件为空或格式有误！");
        return;
    }

    // 2. 处理图层
    var layerCount = doc.layers.length;
    // 记录分组名到组对象
    var groupMap = {};
    // 提前创建分组确保顺序不乱
    for (var i=0; i<csvData.length; i++) {
        var cat = csvData[i].category.trim();
        if (cat && !(cat in groupMap)) {
            groupMap[cat] = getOrCreateGroup(doc, cat);
        }
    }

    for (var i=0; i<csvData.length; i++) {
        var idx = csvData[i].index;
        var newName = csvData[i].newName;
        var cat = csvData[i].category.trim();

        // 图层索引与doc.layers的顺序一致（0为最上面）
        if (idx < 0 || idx >= layerCount) continue;
        var layer = doc.layers[idx];
        layer.name = newName;

        if (cat) {
            // 移动到对应分组
            var grp = groupMap[cat];
            try {
                // 先设为当前活动
                doc.activeLayer = layer;
                // 移动到组里
                layer.move(grp, ElementPlacement.INSIDE);
            } catch(e) {}
        }
    }
    alert("批量重命名及分组完成！");
})();