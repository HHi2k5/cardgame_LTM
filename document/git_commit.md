Skip to content
You’re almost there — sign up to start building in Notion today.
Sign up or login
Github/GitWorkflow
Github/GitWorkflow
git repo: Hwy3rd/iot-project-repo
1. Các thuật ngữ
Giả định flow chỉ bao gồm các thành phần:
Local: Máy cá nhân
Remote: Code trên Github
Develop: Branch thử nghiệm/dev
Production: Branch sản phẩm, chứa commit cuối cùng
2. Workflow
2.1. Tạo branch:
Checkout sang nhánh production: git checkout production
Kéo code mới nhất từ remote về: git pull
Tạo branch mới: git branch -b <tên branch>
Quy tắc đặt tên branch:
Sử dụng cấu trúc: <Loại>/<Mô tả>
<Loại> bao gồm: feature (feat), bugfix (fix), refactor, chore,…
ví dụ: feat/user-login, fix/button-not-working,…
2.2. Commit code và tạo pull request lên nhánh develop

Thêm file vào stagging để chuẩn bị commit: git add . 
Commit code: git commit -m “<mô tả tính năng>”
Lấy code mới nhất từ develop: git fetch origin develop
Merge develop vào nhánh hiện tại: git merge origin/develop
Resolve conflict (nếu có) và commit merged code
Publish branch lên remote: git push -u origin <tên branch>
Tạo pull request vào develop
2.3. Tạo pull request lên production

Từ branch vừa merge develop, loại bỏ commit merged: git reset --hard HEAD~ 
Lấy code mới nhất ở production: git fetch origin production
Merge production vào nhánh hiện tại: git merge origin/production
Resolve conflict (nếu có) và commit merged code
Force push branch hiện tại lên remote: git push -f
Tạo pull request vào production
