# 余白 — シンプルなメモ帳

Next.js / TypeScript / Tailwind CSS / Tiptap / Supabase。Vercelに公開できるWebアプリです。

## 実装した機能

- メモの作成・編集・削除、タイトル・本文、作成日時・更新日時
- 自動保存、未保存状態とエラー表示、再試行
- タイトル・本文のキーワード検索
- 更新日時の新しい順／古い順、タイトルの昇順／降順
- 選択した文字の太字・文字色・装飾解除、元に戻す／やり直す
- ダークテーマ、PCでは2ペイン、スマホでは一覧と編集を切り替え
- ゲストはIndexedDBに保存。ゲストのメモをサーバーに送信しません
- Googleログイン後はSupabaseに保存、約5秒間隔と画面復帰時に同期
- 許可したアカウント以外のデータ利用をDB側で拒否
- ゲストメモのクラウドへのコピー（明示操作、ローカル原本を保持）
- 同時編集時の更新番号チェック。競合時は上書きせず、別メモとして内容を保存可能

お気に入り、ゲーム専用機能はありません。

## 最初に試す（ゲストのみ）

Node.js 22以上を用意し、このフォルダで実行します。

```sh
npm ci
npm run dev
```

ブラウザで http://localhost:3000 を開きます。環境変数なしでゲスト機能が使えます。

ゲストデータはURLのオリジン・端末・ブラウザごとに分かれます。ローカルで書いたメモはVercelのURLへ自動では引き継がれません。サイトデータの消去、プライベートブラウズ終了、ブラウザの保存領域整理などで消える場合があります。

## Vercelで公開する

### ゲスト版を先に公開

1. このフォルダの内容を自分のGitHubリポジトリへアップロードします。`.env.local`、`node_modules`、`.next`は含めません。
2. https://vercel.com/new を開き、リポジトリをImportします。
3. Framework PresetはNext.js。`package.json`のあるフォルダをRoot Directoryにします。
4. 環境変数なしでDeployできます。発行されたURLでゲスト版が動きます。

GitHubを使わず、Vercel CLIで公開する場合は、このフォルダで `npx vercel` を実行してアカウント認証と案内に従い、確認後 `npx vercel --prod` を実行します。実行に伴うサービス側の料金・プラン確認はVercel画面で行ってください。

### Googleログインとクラウド保存を有効にする

1. https://supabase.com/dashboard でプロジェクトを作成します。
2. SQL Editorで `supabase/schema.sql` 全体を一度実行します。
3. 続けて、利用するGoogleアカウントを登録します（小文字で指定）。

```sql
insert into public.allowed_accounts(email) values ('自分のメールアドレス');
```

4. SupabaseのAuthentication → ProvidersでGoogleを有効にします。Emailなど使わないログイン方式は無効にしてください。
5. https://console.cloud.google.com/ でGoogle Auth PlatformのアプリとOAuthクライアント（ウェブアプリケーション）を作成します。テスト公開ならAudienceのテストユーザーに自分を追加します。スコープはopenid・email・profileだけで十分です。
6. Google側の「承認済みのJavaScript生成元」にVercelの公開URL、「承認済みのリダイレクトURI」にSupabaseのGoogle設定画面に表示されるコールバックURL（`https://PROJECT.supabase.co/auth/v1/callback`）を登録します。
7. Googleで発行したClient IDとClient Secretを**SupabaseのGoogle設定画面**に入力して保存します。Client Secretはこのアプリやチャットへ貼る必要はありません。
8. SupabaseのAuthentication → URL ConfigurationでSite URLとRedirect URLsにVercelの公開URLを設定します。ローカルで試す場合だけ `http://localhost:3000` も追加します。
9. VercelのProject Settings → Environment Variablesに下記を登録します。

| 名前                            | 値                                             |
| ------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase Project URL                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのpublishable keyまたはlegacy anon key |

`service_role`キーやsecret keyは使いません。ブラウザ向けのキーは公開されるため、同梱SQLのRLSと許可アカウント設定が必要です。

10. VercelでRedeployします。これらの変数はビルド時に組み込まれます。
11. アプリ左下の「ゲストモード」から「Googleでログイン」を選びます。許可したGoogleアカウントでログインします。
12. ゲストメモがあれば、左下のアカウント画面から「クラウドにコピー」を押します。既に同じIDがあるメモは再コピーせず、既存のクラウドメモを維持します。

PCとスマホで同じ公開URLとGoogleアカウントを使ってください。端末ごとに「保存しました」を確認してから切り替えるとスムーズです。

## ローカルでクラウド接続を試す

`.env.example` を `.env.local` にコピーし、上記2つの値を入力してから `npm run dev` で起動します。ゲスト保存とクラウド保存は分離しています。オフライン中のクラウド編集はメモリ上で保持し、再試行できますが、保存前にページを閉じると失われます（閉じる前に警告）。完全なオフラインアプリ／PWAではありません。

## 構造

- `app/page.tsx`: 一覧、リッチテキスト編集、アカウント、保存と同期
- `app/globals.css`: PC・スマホのレイアウト
- `lib/store.ts`: IndexedDBとSupabaseの読み書き
- `supabase/schema.sql`: テーブル、RLS、アカウント制限、競合チェック付き保存・削除
- `tests/`: 保存の往復テストとPostgreSQLでの権限・競合テスト

本文はHTMLではなくTiptap JSONで保存します。検索用にプレーンテキストも保持します。アカウント制限はクライアントの表示だけでなく、DBのポリシーでも検証します。Google認証自体を終えた未許可ユーザーもメモデータへアクセスできません。

## 検証

```sh
npm test
npm run build
```

IndexedDBのCRUDと文字装飾の保持、PostgreSQL互換のPGliteで所有者分離・未許可アカウント拒否・匿名拒否・古い更新番号による保存／削除の拒否を検証します。

実際のGoogle OAuth、Supabaseの実プロジェクト、Vercel公開、PC／スマートフォン実ブラウザでの操作は、外部アカウントを設定した後に確認が必要です。WebMCP対応ブラウザでは検索ツールを公開しますが、対応環境での動作は未検証です。

## 公開後の確認

- ゲストでメモを作り、タイトル・本文・太字・文字色が再読み込み後も残る
- 検索、4種類の並び替え、削除確認が機能する
- PCとスマホの同じGoogleアカウントで同じメモを閲覧できる
- 他の未許可アカウントではクラウドメモを閲覧・変更できない
- 同じメモを両端末で編集すると古い内容の上書きを拒否する
- ゲストからのコピーを再実行しても同じメモが重複しない

## 公式資料

- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/database/postgres/row-level-security
