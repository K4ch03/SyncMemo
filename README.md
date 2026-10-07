# SyncMemo — Google ログイン対応メモ帳

Next.js / TypeScript / Tailwind CSS / Tiptap / Supabase。Vercel用のプロジェクトです。

X連携は削除しました。SupabaseでXプロバイダーを有効にしていた場合は無効にしてください。既存のアカウントやメモを削除する処理はありません。

左側の一覧はタイトルのみを表示し、本文と日時のプレビューを非表示にしました。検索欄は後続のコンパクト表示更新で削除しました。

## 今回の更新を適用する（すでにVercelに公開している場合）

1. このフォルダのコードでリポジトリのアプリを更新します。既存のVercel環境変数は維持してください。
2. 旧版の `supabase/schema.sql` を実行済みなら、Supabase SQL Editorで **`supabase/migrations/20261007_public_login.sql` だけ**を実行します。新しいschema.sqlを重ねて実行しないでください。
3. まだDBを作っていない場合は、新しい `supabase/schema.sql` を一度実行します。許可メールアドレスの登録は不要です。
4. 下記のGoogle設定を行い、Vercelに再デプロイします。

移行SQLは既存メモと所有者を維持し、利用者の許可リスト制限だけを外します。誰でも登録できますが、各自が読み書きできるのは自分のメモだけです。旧版のallowed_accountsテーブルとis_allowed関数は互換性のため残り、新版では使いません。アプリのコードとDBポリシーを両方更新してください。

## Googleログインの設定

1. Supabaseの Authentication → Sign In / Providers でGoogleを有効化します。
2. Google Cloud ConsoleのGoogle Auth PlatformでOAuthクライアント（ウェブアプリケーション）を作ります。
3. Google側のJavaScript生成元にVercelの本番URL、リダイレクトURIにSupabaseのGoogle設定画面のCallback URLを登録します。
4. GoogleのClient ID / Client SecretをSupabaseのGoogle設定に入力して保存します。
5. 他の人も利用できるように、Google Auth Platformの対象ユーザーをExternalにし、Audienceで本番公開します。Testingのままではテストユーザー登録が必要です。Googleから検証や追加設定を求められた場合はその案内に従ってください。
6. 必要なスコープはopenid・email・profileです。

## 共通の接続設定

Supabaseの Authentication → URL Configuration で、Site URLとRedirect URLsにVercelの本番URLを登録します。例：`https://your-app.vercel.app`。公開URLが変わったら更新してください。

Vercelの Settings → Environment Variables に登録し、再デプロイします。

| 名前 | 値 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable keyまたはlegacy anon key |

`service_role`やsecret keyは使いません。環境変数はビルド時に組み込まれます。Supabaseでは新規ユーザー登録を許可し、Googleを有効にしてください。利用しないEmail認証や匿名認証は無効のままで構いません。ゲスト機能はSupabase匿名認証を使いません。

## プライバシーポリシー

`/privacy` にログイン不要のページを追加しています。メモ帳の左下とGoogleログイン画面から開けます。

VercelのEnvironment Variablesで `PRIVACY_OPERATOR_NAME` に公開する運営者名、`PRIVACY_CONTACT_EMAIL` に問い合わせ用メールアドレスを設定し、再デプロイしてください。未設定時は連絡先が「準備中」と表示されます。一般公開前に実際の窓口を登録してください。

Google Auth Platformのブランディングには、本番URLの末尾に `/privacy` を付けたURLを登録します。例：`https://your-app.vercel.app/privacy`。この文面は同梱アプリの実装に合わせたものです。実際の運用・ログ設定・保存期間と一致することを確認してください。

## ログイン方法とメモの関係

PC・スマホでは同じGoogleアカウントを使ってください。

## 機能

- メモの新規作成・編集・削除、タイトル・本文、作成日時・更新日時
- 自動保存、保存状態・エラー表示、再試行
- 更新日時／タイトルの昇順・降順と並び替え順の保存
- 選択文字の太字・文字色変更・装飾解除、元に戻す／やり直す
- PCの2ペイン、スマホの一覧／編集切り替え、ダークテーマ
- ゲストはIndexedDB保存。ゲストの本文はサーバーに送信しません
- Googleログインはクラウド保存。約5秒間隔と画面復帰時に同期
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

Googleの実OAuth接続、Supabase実プロジェクト、Vercel公開、実機ブラウザの操作確認は外部設定後に必要です。これらを設定済み・検証済みとはしていません。

## 公式資料

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://vercel.com/docs/frameworks/full-stack/nextjs

## コンパクト表示の更新

アプリ名をSyncMemoに変更。左上の「…」にアプリ名・アカウント・プライバシーポリシーをまとめ、常設のタイトル／アカウントエリアと検索欄を削除しました。メモ行は約半分の高さです。
並び替え順は同じブラウザ・同じURLで保存され、再読み込み後も維持します。端末間の設定同期ではありません。サイトデータを消すと初期値に戻ります。

## 編集画面の余白更新

本文は行間1.5、段落の下余白2pxに変更。タイトル周りの余白を縮小し、MY NOTE・作成日・装飾の補足文を削除しました。最終更新日時は端末の時刻でyyyy/MM/dd HH:mm表示です。メニューの名称は「アカウント」です。
ゲスト時のみ下部に警告アイコンを表示します。マウスオーバー、タップ、キーボードフォーカスで案内が開き、外側クリック・Escで閉じます。スマホの編集画面にも表示します。
