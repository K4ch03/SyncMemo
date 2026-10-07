# 余白 — Google / X ログイン対応メモ帳

Next.js / TypeScript / Tailwind CSS / Tiptap / Supabase。Vercel用のプロジェクトです。

## 今回の更新を適用する（すでにVercelに公開している場合）

1. このフォルダのコードでリポジトリのアプリを更新します。既存のVercel環境変数は維持してください。
2. 旧版の `supabase/schema.sql` を実行済みなら、Supabase SQL Editorで **`supabase/migrations/20261007_public_login.sql` だけ**を実行します。新しいschema.sqlを重ねて実行しないでください。
3. まだDBを作っていない場合は、新しい `supabase/schema.sql` を一度実行します。許可メールアドレスの登録は不要です。
4. 下記のGoogle・X設定を行い、Vercelに再デプロイします。

移行SQLは既存メモと所有者を維持し、利用者の許可リスト制限だけを外します。誰でも登録できますが、各自が読み書きできるのは自分のメモだけです。旧版のallowed_accountsテーブルとis_allowed関数は互換性のため残り、新版では使いません。アプリのコードとDBポリシーを両方更新してください。

## Googleログインの設定

1. Supabaseの Authentication → Sign In / Providers でGoogleを有効化します。
2. Google Cloud ConsoleのGoogle Auth PlatformでOAuthクライアント（ウェブアプリケーション）を作ります。
3. Google側のJavaScript生成元にVercelの本番URL、リダイレクトURIにSupabaseのGoogle設定画面のCallback URLを登録します。
4. GoogleのClient ID / Client SecretをSupabaseのGoogle設定に入力して保存します。
5. 他の人も利用できるように、Google Auth Platformの対象ユーザーをExternalにし、Audienceで本番公開します。Testingのままではテストユーザー登録が必要です。Googleから検証や追加設定を求められた場合はその案内に従ってください。
6. 必要なスコープはopenid・email・profileです。

## Xログインの設定（OAuth 2.0）

1. https://developer.x.com/ の開発者ダッシュボードでProject / Appを用意します。
2. アプリの User authentication settings を開き、OAuth 2.0のWeb Appとして設定します。
3. Supabaseの Authentication → Sign In / Providers → **X / Twitter (OAuth 2.0)** のCallback URLをコピーします。
4. X側で次の値を設定します。

| Xの設定欄 | 値 |
| --- | --- |
| Type of App | Web App（サーバー側シークレットを使う種類） |
| Callback URI / Redirect URL | Supabase画面からコピーした `https://PROJECT.supabase.co/auth/v1/callback` |
| Website URL | Vercelの本番URL |
| Request email from users | 有効（Supabase公式手順に従う） |
| Terms of service URL / Privacy policy URL | 運営者が用意した実際の利用規約・プライバシーポリシーのURL |

5. Keys and tokensでOAuth 2.0の **Client ID / Client Secret** を取得します。
6. Supabaseの **X / Twitter (OAuth 2.0)** を有効にし、そのClient ID / Client Secretを入力・保存します。
7. アプリの「ゲストモード」から「Xでログイン」を選んで確認します。

コードのproviderは `x` です。旧方式の `twitter`（OAuth 1.0a）ではありません。API Key / API SecretやBearer Tokenではなく、OAuth 2.0のClient ID / Client Secretを使用してください。Client SecretはSupabaseだけに入力し、ブラウザ用の環境変数やGitHubには入れません。

Xの開発者アカウント、利用規約・プライバシーポリシーのURLは運営者による準備が必要です。このプロジェクトにはそれらの法的文書を含めていません。Xダッシュボードで要求されるアクセス条件・設定も確認してください。

## 共通の接続設定

Supabaseの Authentication → URL Configuration で、Site URLとRedirect URLsにVercelの本番URLを登録します。例：`https://your-app.vercel.app`。公開URLが変わったら更新してください。

Vercelの Settings → Environment Variables に登録し、再デプロイします。

| 名前 | 値 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable keyまたはlegacy anon key |

`service_role`やsecret keyは使いません。環境変数はビルド時に組み込まれます。Supabaseでは新規ユーザー登録を許可し、GoogleとXを有効にしてください。利用しないEmail認証や匿名認証は無効のままで構いません。ゲスト機能はSupabase匿名認証を使いません。

## ログイン方法とメモの関係

PC・スマホでは同じログイン方法・同じアカウントを使ってください。

GoogleとXが同じ確認済みメールアドレスを返す場合、Supabaseによって同一ユーザーに自動連携されることがあります。メールアドレスが異なるなどの場合は別のユーザー・別のメモ帳になるため、ログイン方法を切り替えれば必ず同じメモが表示されるわけではありません。この版では既存アカウントの手動統合は提供していません。

## 機能

- メモの新規作成・編集・削除、タイトル・本文、作成日時・更新日時
- 自動保存、保存状態・エラー表示、再試行
- タイトル・本文の検索、更新日時／タイトルの昇順・降順
- 選択文字の太字・文字色変更・装飾解除、元に戻す／やり直す
- PCの2ペイン、スマホの一覧／編集切り替え、ダークテーマ
- ゲストはIndexedDB保存。ゲストの本文はサーバーに送信しません
- Google / Xログインはクラウド保存。約5秒間隔と画面復帰時に同期
- ゲストメモのクラウドへのコピー（操作時のみ、ローカル原本保持）
- 同時編集の競合を検出し、古い内容での上書きを防止

ゲストのメモは端末・ブラウザ・サイトのオリジンごとに別です。サイトデータ削除などで失われます。クラウド保存に失敗した変更は再試行できますが、保存前にページを閉じると失われます（閉じる前に警告）。完全なオフラインアプリ／PWAではありません。

## ローカル起動

Node.js 22以上を用意します。

```sh
npm ci
npm run dev
```

http://localhost:3000 を開きます。環境変数なしでゲスト版が動きます。クラウドを試す場合は `.env.example` を `.env.local` にコピーして値を入力し、SupabaseのRedirect URLsにもローカルURLを追加します。

## 検証

```sh
npm test
npm run build
```

IndexedDBのCRUD・装飾保持と、PostgreSQL互換のPGliteで新規ユーザーの利用、他ユーザーの読み書き拒否、匿名拒否、編集競合、移行SQLの繰り返し実行・既存メモ保持を検証します。

Google / Xの実OAuth接続、Supabase実プロジェクト、Vercel公開、実機ブラウザの操作確認は外部設定後に必要です。これらを設定済み・検証済みとはしていません。

## 公式資料

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-twitter
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://vercel.com/docs/frameworks/full-stack/nextjs
