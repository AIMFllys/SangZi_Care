# 桑梓智护 — ProGuard 规则
# 保留 JSBridge 接口
-keepclassmembers class com.sangzi.smartcare.MainActivity$JSBridge {
    public *;
}
-keepattributes JavascriptInterface
