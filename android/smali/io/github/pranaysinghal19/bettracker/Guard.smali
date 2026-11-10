.class public Lio/github/pranaysinghal19/bettracker/Guard;
.super Landroid/webkit/WebViewClient;

# Keeps the app on its own bundled pages. https:// and tel: links (the support contacts)
# open outside the app in the phone's browser or dialer; everything else is refused.

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .registers 5
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    invoke-direct {p0, p1, v0}, Lio/github/pranaysinghal19/bettracker/Guard;->open(Landroid/webkit/WebView;Landroid/net/Uri;)V
    const/4 v1, 0x1
    return v1
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .registers 5
    invoke-static {p2}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v0
    invoke-direct {p0, p1, v0}, Lio/github/pranaysinghal19/bettracker/Guard;->open(Landroid/webkit/WebView;Landroid/net/Uri;)V
    const/4 v1, 0x1
    return v1
.end method

.method private open(Landroid/webkit/WebView;Landroid/net/Uri;)V
    .registers 7
    if-eqz p2, :done
    invoke-virtual {p2}, Landroid/net/Uri;->getScheme()Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :done
    const-string v1, "https"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v2
    if-nez v2, :go
    const-string v1, "tel"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v2
    if-eqz v2, :done
    :go
    :try_start
    new-instance v1, Landroid/content/Intent;
    const-string v2, "android.intent.action.VIEW"
    invoke-direct {v1, v2, p2}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V
    const/high16 v2, 0x10000000
    invoke-virtual {v1, v2}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;
    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v3
    invoke-virtual {v3, v1}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :failed
    :done
    return-void
    :failed
    move-exception v0
    return-void
.end method
