/**
 * 2024终极解决版：递归导出所有可见未锁定的普通像素层和智能对象为PNG，兼容所有PS/中文路径
 * - 多级组无限嵌套全部遍历
 * - 仅导出LayerKind.NORMAL和LayerKind.SMARTOBJECT类型的ArtLayer
 * - 支持父组可见链判定
 * - 用PNGSaveOptions绝不再报错
 * - 桌面“PS_Layer_Export”目录（如已有则覆盖）
 */

(function () {
    var doc = app.activeDocument;
    var desktop = Folder.desktop;
    var exportFolder = new Folder(desktop + "/PS_Layer_Export");
    if (!exportFolder.exists) exportFolder.create();

    var exportedCount = 0;

    function sanitizeName(name) {
        return name.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_");
    }
    // 判断整个可见性链(层和所有父组全部可见才视为可见)
    function isFullyVisible(layer) {
        var cur = layer;
        while (cur && cur !== doc) {
            if (!cur.visible) return false;
            cur = cur.parent;
        }
        return true;
    }
    // 主递归
    function traverseLayers(obj, prefix) {
        for (var i = 0; i < obj.layers.length; i++) {
            var layer = obj.layers[i];
            if (layer.typename === "LayerSet") {
                traverseLayers(layer, prefix + sanitizeName(layer.name) + "_");
            } else if (
                layer.typename === "ArtLayer" &&
                isFullyVisible(layer) &&
                !layer.locked &&
                (layer.kind === LayerKind.NORMAL || layer.kind === LayerKind.SMARTOBJECT)
            ) {
                // 只让自己和父组显示，其他都隐藏
                var prevState = [];
                saveAllVisibility(doc, prevState);
                hideAllLayers(doc);
                var temp = layer;
                while (temp && temp !== doc) {
                    temp.visible = true;
                    temp = temp.parent;
                }
                layer.visible = true;

                // 复制文档并保存PNG
                var tempDoc = doc.duplicate();
                tempDoc.resizeCanvas(200, 200, AnchorPosition.MIDDLECENTER);
                try {
                    var fileName = prefix + sanitizeName(layer.name) + ".png";
                    var file = new File(exportFolder + "/" + fileName);

                    var pngOptions = new PNGSaveOptions();
                    pngOptions.interlaced = false;
                    tempDoc.saveAs(file, pngOptions, true, Extension.LOWERCASE);

                    exportedCount++;
                } catch (e) {}
                tempDoc.close(SaveOptions.DONOTSAVECHANGES);

                restoreVisibility(prevState);
            }
        }
    }
    // 保存所有层可见性
    function saveAllVisibility(obj, stateArr) {
        for (var i = 0; i < obj.layers.length; i++) {
            var layer = obj.layers[i];
            stateArr.push({layer: layer, visible: layer.visible});
            if (layer.typename === "LayerSet") saveAllVisibility(layer, stateArr);
        }
    }
    // 恢复所有层可见性
    function restoreVisibility(stateArr) {
        for (var i = 0; i < stateArr.length; i++) {
            try {
                stateArr[i].layer.visible = stateArr[i].visible;
            } catch (e){}
        }
    }
    // 隐藏所有层
    function hideAllLayers(obj) {
        for (var i = 0; i < obj.layers.length; i++) {
            try { obj.layers[i].visible = false; } catch(e){}
            if (obj.layers[i].typename === "LayerSet") hideAllLayers(obj.layers[i]);
        }
    }

    // 执行导出
    traverseLayers(doc, '');

    alert("导出完成，共导出 " + exportedCount + " 个图层。");
})();