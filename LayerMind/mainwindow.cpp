#include "mainwindow.h"
#include <QWidget>
#include <QHeaderView>
#include <QMessageBox>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    // 设置窗口标题
    setWindowTitle("LayerMind - PS 图层智能命名工具");
    
    // 设置窗口大小
    resize(800, 600);
    
    // 创建中心部件
    QWidget *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);
    
    // 创建布局
    mainLayout = new QVBoxLayout(centralWidget);
    topLayout = new QHBoxLayout();
    bottomLayout = new QHBoxLayout();
    
    // 创建 UI 组件
    selectFolderBtn = new QPushButton("选择图层文件夹", this);
    folderPathEdit = new QLineEdit(this);
    folderPathEdit->setReadOnly(true);
    folderPathEdit->setPlaceholderText("请选择包含图层 PNG 图片的文件夹");
    
    analyzeBtn = new QPushButton("一键智能分析与命名", this);
    
    resultTable = new QTableWidget(this);
    resultTable->setColumnCount(5);
    resultTable->setHorizontalHeaderLabels({"原文件名", "识别内容", "新图层名", "分类", "视觉层级"});
    resultTable->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    
    generateScriptBtn = new QPushButton("生成 PS 重命名脚本", this);
    
    // 设置布局
    topLayout->addWidget(selectFolderBtn);
    topLayout->addWidget(folderPathEdit);
    
    bottomLayout->addStretch();
    bottomLayout->addWidget(generateScriptBtn);
    
    mainLayout->addLayout(topLayout);
    mainLayout->addWidget(analyzeBtn);
    mainLayout->addWidget(resultTable);
    mainLayout->addLayout(bottomLayout);
    
    // 连接信号槽
    connect(selectFolderBtn, &QPushButton::clicked, this, &MainWindow::onSelectFolderClicked);
    connect(analyzeBtn, &QPushButton::clicked, this, &MainWindow::onAnalyzeClicked);
    connect(generateScriptBtn, &QPushButton::clicked, this, &MainWindow::onGenerateScriptClicked);
    
    // 初始禁用分析和生成按钮
    analyzeBtn->setEnabled(false);
    generateScriptBtn->setEnabled(false);
    
    // 初始化网络管理器
    networkManager = new QNetworkAccessManager(this);
    
    // 百度 AI API 配置（这里需要替换为您自己的 API Key 和 Secret Key）
    apiKey = "your_api_key_here";
    secretKey = "your_secret_key_here";
    accessToken = "";
}

MainWindow::~MainWindow()
{
}

// 选择文件夹按钮点击事件
void MainWindow::onSelectFolderClicked()
{
    QString folderPath = QFileDialog::getExistingDirectory(this, "选择图层文件夹", QDir::homePath());
    if (!folderPath.isEmpty()) {
        selectedFolder = folderPath;
        folderPathEdit->setText(folderPath);
        analyzeBtn->setEnabled(true);
        generateScriptBtn->setEnabled(false);
        
        // 清空表格
        resultTable->setRowCount(0);
        layerInfos.clear();
    }
}

// 一键智能分析与命名按钮点击事件
void MainWindow::onAnalyzeClicked()
{
    if (selectedFolder.isEmpty()) {
        QMessageBox::warning(this, "警告", "请先选择图层文件夹");
        return;
    }
    
    // 获取文件夹中的 PNG 图片
    QStringList pngFiles = getPNGImagesInFolder(selectedFolder);
    if (pngFiles.isEmpty()) {
        QMessageBox::information(this, "信息", "所选文件夹中没有 PNG 图片");
        return;
    }
    
    // 清空之前的信息
    resultTable->setRowCount(0);
    layerInfos.clear();
    
    // 处理每个 PNG 图片
    for (const QString &filePath : pngFiles) {
        QFileInfo fileInfo(filePath);
        QString originalName = fileInfo.fileName();
        
        // 识别图片内容
        QString recognizedContent = recognizeImage(filePath);
        
        // 生成新的图层名称
        QString newName = generateNewLayerName(recognizedContent);
        
        // 生成分类标签
        QString category = generateCategory(recognizedContent);
        
        // 生成视觉层级
        QString visualLayer = generateVisualLayer(recognizedContent, category);
        
        // 存储图层信息
        LayerInfo info;
        info.originalName = originalName;
        info.recognizedContent = recognizedContent;
        info.newName = newName;
        info.category = category;
        info.visualLayer = visualLayer;
        layerInfos.append(info);
        
        // 添加到表格
        int row = resultTable->rowCount();
        resultTable->insertRow(row);
        resultTable->setItem(row, 0, new QTableWidgetItem(originalName));
        resultTable->setItem(row, 1, new QTableWidgetItem(recognizedContent));
        resultTable->setItem(row, 2, new QTableWidgetItem(newName));
        resultTable->setItem(row, 3, new QTableWidgetItem(category));
        resultTable->setItem(row, 4, new QTableWidgetItem(visualLayer));
    }
    
    // 启用生成脚本按钮
    generateScriptBtn->setEnabled(true);
    
    QMessageBox::information(this, "信息", "分析完成，共处理 " + QString::number(pngFiles.size()) + " 个图层");
}

// 生成 PS 重命名脚本按钮点击事件
void MainWindow::onGenerateScriptClicked()
{
    if (layerInfos.isEmpty()) {
        QMessageBox::warning(this, "警告", "请先进行智能分析");
        return;
    }
    
    // 生成 rename_list.csv 文件
    QString csvPath = QDir::homePath() + "/Desktop/PS_Layer_Export/rename_list.csv";
    
    // 确保目录存在
    QDir desktopDir(QDir::homePath() + "/Desktop");
    if (!desktopDir.exists("PS_Layer_Export")) {
        desktopDir.mkdir("PS_Layer_Export");
    }
    
    // 写入 CSV 文件
    QFile csvFile(csvPath);
    if (csvFile.open(QIODevice::WriteOnly | QIODevice::Text)) {
        QTextStream out(&csvFile);
        
        // 写入表头
    out << "图层索引,新图层名,分类标签,视觉层级" << endl;
    
    // 写入数据
    for (int i = 0; i < layerInfos.size(); i++) {
        const LayerInfo &info = layerInfos[i];
        
        // 提取图层索引（从文件名中提取）
        QString originalName = info.originalName;
        int layerIndex = originalName.split('_').first().toInt();
        
        out << layerIndex << "," << info.newName << "," << info.category << "," << info.visualLayer << endl;
    }
        
        csvFile.close();
        
        QMessageBox::information(this, "信息", "PS 重命名脚本生成完成！\n文件路径：" + csvPath);
    } else {
        QMessageBox::critical(this, "错误", "无法创建重命名脚本文件");
    }
}

// 遍历文件夹中的 PNG 图片
QStringList MainWindow::getPNGImagesInFolder(const QString &folderPath)
{
    QStringList pngFiles;
    QDir dir(folderPath);
    
    // 过滤 PNG 文件
    QStringList filters; filters << "*.png";
    dir.setNameFilters(filters);
    
    // 获取所有 PNG 文件
    QFileInfoList fileInfos = dir.entryInfoList(QDir::Files | QDir::NoDotAndDotDot);
    for (const QFileInfo &fileInfo : fileInfos) {
        pngFiles.append(fileInfo.absoluteFilePath());
    }
    
    return pngFiles;
}



// 生成新的图层名称
QString MainWindow::generateNewLayerName(const QString &recognizedContent)
{
    QString newName;
    QString content = recognizedContent;
    
    // 清理识别内容
    content = content.trimmed();
    if (content.isEmpty() || content == "[未识别]" || content.startsWith("[错误]")) {
        return "[未识别]";
    }
    
    // 颜色关键词映射
    QMap<QString, QString> colorMap;
    colorMap.insert("红色", "红色");
    colorMap.insert("蓝色", "蓝色");
    colorMap.insert("绿色", "绿色");
    colorMap.insert("黄色", "黄色");
    colorMap.insert("紫色", "紫色");
    colorMap.insert("橙色", "橙色");
    colorMap.insert("粉色", "粉色");
    colorMap.insert("黑色", "黑色");
    colorMap.insert("白色", "白色");
    colorMap.insert("灰色", "灰色");
    colorMap.insert("棕色", "棕色");
    colorMap.insert("金色", "金色");
    colorMap.insert("银色", "银色");
    
    // 内容类型关键词
    QStringList typeKeywords = {"标题", "文字", "文本", "按钮", "图标", "背景", "纹理", "图片", "图像", "照片", "标志", "logo", "装饰", "边框", "形状", "人物", "头像", "动物", "植物", "建筑", "风景", "插图", "插画", "水印", "线条", "圆形", "方形", "三角形", "星星", "心形", "箭头", "符号", "图案", "网格", "渐变", "阴影", "高光", "发光", "模糊", "滤镜", "效果", "元素", "素材", "组件", "模块", "控件", "导航", "菜单", "卡片", "弹窗", "对话框", "按钮组", "图标组", "文本框", "输入框", "搜索框", "登录", "注册", "购物车", "收藏", "点赞", "分享", "下载", "上传", "播放", "暂停", "停止", "前进", "后退", "返回", "关闭", "打开", "展开", "收起", "更多", "全部", "首页", "个人中心", "设置", "帮助", "关于", "联系我们", "版权", "隐私政策", "服务条款"};
    
    // 提取颜色
    QString color = "";
    for (auto it = colorMap.begin(); it != colorMap.end(); ++it) {
        if (content.contains(it.key())) {
            color = it.value();
            break;
        }
    }
    
    // 提取主要内容
    QString mainType = "";
    for (const QString &keyword : typeKeywords) {
        if (content.contains(keyword)) {
            mainType = keyword;
            break;
        }
    }
    
    // 构建名称
    QStringList parts = content.split("，");
    QString firstPart = parts.first();
    
    // 移除冗余词汇
    QStringList redundantWords = {"一张", "一个", "一幅", "一种", "的", "了", "是", "在", "有", "和", "与", "或", "但", "而", "也", "都", "就", "才", "又", "再", "还", "很", "非常", "特别", "比较", "更加", "最", "更"};
    for (const QString &word : redundantWords) {
        firstPart = firstPart.replace(word, "");
    }
    
    // 构建最终名称
    if (!color.isEmpty() && !mainType.isEmpty()) {
        newName = color + mainType;
    } else if (!color.isEmpty()) {
        newName = color + firstPart.left(10);
    } else if (!mainType.isEmpty()) {
        newName = firstPart.left(15);
    } else {
        newName = mainType;
    }
    
    // 限制长度
    if (newName.length() > 25) {
        newName = newName.left(25);
    }
    
    // 如果新名称为空，使用默认值
    if (newName.isEmpty()) {
        newName = "图层";
    }
    
    return newName;
}

// 生成分类标签
QString MainWindow::generateCategory(const QString &recognizedContent)
{
    QString content = recognizedContent;
    content = content.trimmed();
    
    if (content.isEmpty() || content == "[未识别]" || content.startsWith("[错误]")) {
        return "";
    }
    
    // 分类规则 - 按优先级排序
    QList<QPair<QStringList, QString>> categoryRules;
    
    // 文字类
    categoryRules.append(qMakePair(QStringList{"文字", "标题", "文本", "字体", "字母", "数字", "字", "词", "句", "段落", "文章"}, "【文字】"));
    
    // 人物类
    categoryRules.append(qMakePair(QStringList{"人物", "人", "头像", "脸", "人脸", "人像", "肖像", "模特"}, "【人物】"));
    
    // 图片素材类
    categoryRules.append(qMakePair(QStringList{"图片", "图像", "照片", "相片", "摄影", "风景", "景物", "插图", "插画", "绘画", "画", "风景照"}, "【素材】"));
    
    // 背景类
    categoryRules.append(qMakePair(QStringList{"背景", "纹理", "底色", "底纹", "背景图", "背景色"}, "【背景】"));
    
    // 图标类
    categoryRules.append(qMakePair(QStringList{"图标", "小图标", "功能图标", "符号", "logo", "标志", "商标", "标识", "徽章"}, "【图标】"));
    
    // 按钮类
    categoryRules.append(qMakePair(QStringList{"按钮", "按键", "按钮图标", "交互按钮", "提交", "确定", "取消", "点击"}, "【按钮】"));
    
    // 形状类
    categoryRules.append(qMakePair(QStringList{"形状", "圆形", "方形", "三角形", "矩形", "多边形", "星形", "心形", "箭头", "线条", "边框"}, "【形状】"));
    
    // 装饰类
    categoryRules.append(qMakePair(QStringList{"装饰", "装饰元素", "花边", "点缀", "花纹", "图案", "纹样", "图案"}, "【装饰】"));
    
    // 效果类
    categoryRules.append(qMakePair(QStringList{"效果", "阴影", "高光", "发光", "渐变", "模糊", "滤镜", "蒙版", "透明度", "混合模式"}, "【效果】"));
    
    // 动物类
    categoryRules.append(qMakePair(QStringList{"动物", "宠物", "猫", "狗", "鸟", "鱼", "虫"}, "【素材】"));
    
    // 植物类
    categoryRules.append(qMakePair(QStringList{"植物", "花", "草", "树", "叶子", "花朵"}, "【素材】"));
    
    // 建筑类
    categoryRules.append(qMakePair(QStringList{"建筑", "房子", "大楼", "房屋", "房屋"}, "【素材】"));
    
    // 检查分类
    for (const auto &rule : categoryRules) {
        for (const QString &keyword : rule.first) {
            if (content.contains(keyword)) {
                return rule.second;
            }
        }
    }
    
    // 默认分类
    return "【其他】";
}

// 生成视觉层级标签（前景/中景/背景）
QString MainWindow::generateVisualLayer(const QString &recognizedContent, const QString &category)
{
    QString content = recognizedContent;
    content = content.trimmed();
    
    if (content.isEmpty() || content == "[未识别]" || content.startsWith("[错误]")) {
        return "";
    }
    
    // 背景层判断
    QStringList backgroundKeywords = {"背景", "纹理", "底色", "底纹", "背景图", "背景色", "风景", "景物"};
    for (const QString &keyword : backgroundKeywords) {
        if (content.contains(keyword) || category.contains("【背景】")) {
            return "背景层";
        }
    }
    
    // 前景层判断
    QStringList foregroundKeywords = {"文字", "标题", "按钮", "图标", "人物", "头像", "装饰", "人物", "logo", "标志", "水印"};
    for (const QString &keyword : foregroundKeywords) {
        if (content.contains(keyword) || category.contains("【文字】") || category.contains("【按钮】") || category.contains("【图标】") || category.contains("【人物】")) {
            return "前景层";
        }
    }
    
    // 默认中景层
    return "中景层";
}

// 获取百度 AI 访问令牌
QString MainWindow::getAccessToken()
{
    if (!accessToken.isEmpty()) {
        return accessToken;
    }
    
    // 构建获取访问令牌的 URL
    QUrl url("https://aip.baidubce.com/oauth/2.0/token");
    QUrlQuery query;
    query.addQueryItem("grant_type", "client_credentials");
    query.addQueryItem("client_id", apiKey);
    query.addQueryItem("client_secret", secretKey);
    url.setQuery(query);
    
    // 创建网络请求
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");
    
    // 发送同步请求
    QNetworkReply *reply = networkManager->get(request);
    QEventLoop loop;
    connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    loop.exec();
    
    // 处理响应
    QString response;
    if (reply->error() == QNetworkReply::NoError) {
        QByteArray responseData = reply->readAll();
        response = QString(responseData);
        
        // 解析 JSON 响应
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        if (!jsonDoc.isNull() && jsonDoc.isObject()) {
            QJsonObject jsonObj = jsonDoc.object();
            if (jsonObj.contains("access_token")) {
                accessToken = jsonObj["access_token"].toString();
            }
        }
    } else {
        qDebug() << "获取访问令牌失败:" << reply->errorString();
    }
    
    reply->deleteLater();
    return accessToken;
}

// 识别图片内容
QString MainWindow::recognizeImage(const QString &imagePath)
{
    // 获取访问令牌
    QString token = getAccessToken();
    if (token.isEmpty()) {
        return "[错误] 无法获取访问令牌";
    }
    
    // 构建通用物体识别 API URL
    QUrl url("https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general");
    url.setQuery("access_token=" + token);
    
    // 读取图片文件并进行 Base64 编码
    QFile file(imagePath);
    if (!file.open(QIODevice::ReadOnly)) {
        return "[错误] 无法读取图片文件";
    }
    QByteArray imageData = file.readAll();
    file.close();
    
    QByteArray base64Data = imageData.toBase64();
    QString base64Str = QString(base64Data);
    
    // 构建请求参数
    QUrlQuery postData;
    postData.addQueryItem("image", base64Str);
    postData.addQueryItem("baike_num", "5");
    
    // 创建网络请求
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");
    
    // 发送同步请求
    QNetworkReply *reply = networkManager->post(request, postData.toString(QUrl::FullyEncoded).toUtf8());
    QEventLoop loop;
    connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    loop.exec();
    
    // 处理响应
    QString recognizedContent;
    if (reply->error() == QNetworkReply::NoError) {
        QByteArray responseData = reply->readAll();
        
        // 解析 JSON 响应
        QJsonDocument jsonDoc = QJsonDocument::fromJson(responseData);
        if (!jsonDoc.isNull() && jsonDoc.isObject()) {
            QJsonObject jsonObj = jsonDoc.object();
            if (jsonObj.contains("result")) {
                QJsonArray resultArray = jsonObj["result"].toArray();
                QStringList keywords;
                
                // 提取前 3 个识别结果
                for (int i = 0; i < qMin(3, resultArray.size()); i++) {
                    QJsonObject item = resultArray[i].toObject();
                    if (item.contains("keyword")) {
                        keywords.append(item["keyword"].toString());
                    }
                }
                
                if (!keywords.isEmpty()) {
                    recognizedContent = keywords.join("，");
                } else {
                    recognizedContent = "[未识别]";
                }
            }
        }
    } else {
        qDebug() << "图片识别失败:" << reply->errorString();
        recognizedContent = "[错误] 识别失败";
    }
    
    reply->deleteLater();
    return recognizedContent;
}