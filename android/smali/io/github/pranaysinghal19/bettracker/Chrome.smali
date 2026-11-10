.class public Lio/github/pranaysinghal19/bettracker/Chrome;
.super Landroid/webkit/WebChromeClient;

.field private a:Lio/github/pranaysinghal19/bettracker/MainActivity;

.method public constructor <init>(Lio/github/pranaysinghal19/bettracker/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lio/github/pranaysinghal19/bettracker/Chrome;->a:Lio/github/pranaysinghal19/bettracker/MainActivity;
    return-void
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 8
    iget-object v0, p0, Lio/github/pranaysinghal19/bettracker/Chrome;->a:Lio/github/pranaysinghal19/bettracker/MainActivity;
    iget-object v1, v0, Lio/github/pranaysinghal19/bettracker/MainActivity;->cb:Landroid/webkit/ValueCallback;
    if-eqz v1, :store
    const/4 v2, 0x0
    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :store
    iput-object p2, v0, Lio/github/pranaysinghal19/bettracker/MainActivity;->cb:Landroid/webkit/ValueCallback;
    :try_start
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v1
    const/4 v2, 0x1
    invoke-virtual {v0, v1, v2}, Landroid/app/Activity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :fail
    const/4 v3, 0x1
    return v3
    :fail
    move-exception v1
    const/4 v2, 0x0
    iput-object v2, v0, Lio/github/pranaysinghal19/bettracker/MainActivity;->cb:Landroid/webkit/ValueCallback;
    const/4 v3, 0x0
    return v3
.end method
