#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QTableWidget>
#include <QPushButton>
#include <QLineEdit>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFileDialog>
#include <QDir>
#include <QStringList>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QUrl>
#include <QUrlQuery>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QEventLoop>
#include <QByteArray>
#include <QFile>
#include <QCryptographicHash>

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    // 选择文件夹按钮点击事件
    void onSelectFolderClicked();
    
    // 一键智能分析与命名按钮点击事件
    void onAnalyzeClicked();
    
    // 生成 PS 重命名脚本按钮点击事件
    void onGenerateScriptClicked();

private:
    // UI 组件
    QPushButton *selectFolderBtn;
    QLineEdit *folderPathEdit;
    QPushButton *analyzeBtn;
    QTableWidget *resultTable;
    QPushButton *generateScriptBtn;
    
    // 布局
    QVBoxLayout *mainLayout;
    QHBoxLayout *topLayout;
    QHBoxLayout *bottomLayout;
    
    // 网络管理器
    QNetworkAccessManager *networkManager;
    
    // 百度 AI API 配置
    QString apiKey;
    QString secretKey;
    QString accessToken;
    
    // 存储选中的文件夹路径
    QString selectedFolder;
    
    // 存储图层信息
    struct LayerInfo {
        QString originalName;
        QString recognizedContent;
        QString newName;
        QString category;
        QString visualLayer;
    };
    QList<LayerInfo> layerInfos;
    
    // 遍历文件夹中的 PNG 图片
    QStringList getPNGImagesInFolder(const QString &folderPath);
    
    // 获取百度 AI 访问令牌
    QString getAccessToken();
    
    // 识别图片内容
    QString recognizeImage(const QString &imagePath);
    
    // 生成新的图层名称
    QString generateNewLayerName(const QString &recognizedContent);
    
    // 生成分类标签
    QString generateCategory(const QString &recognizedContent);
    
    // 生成视觉层级标签（前景/中景/背景）
    QString generateVisualLayer(const QString &recognizedContent, const QString &category);
};
#endif // MAINWINDOW_H