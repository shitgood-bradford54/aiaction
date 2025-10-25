# GitHub Actions + Claude Code 自动化系统测试

本目录包含完整的测试套件，用于验证 GitHub Actions + Claude Code 自动化系统的功能。

## 📁 目录结构

```
.github/tests/
├── README.md                      # 本文件 - 测试运行指南
├── unit/                          # 单元测试 (Shell 脚本测试)
│   ├── test-setup-branch.sh      # 测试分支管理脚本
│   ├── test-setup-env.sh         # 测试环境设置脚本
│   └── test-run-claude.sh        # 测试 Claude 执行脚本
├── integration/                   # 集成测试 (GitHub Actions 工作流)
│   ├── test-trigger-workflow.yml # 测试触发器工作流
│   └── test-execute-workflow.yml # 测试执行工作流
├── e2e/                          # 端到端测试
│   └── test-scenarios.md         # 端到端测试场景
└── fixtures/                     # 测试数据
    ├── sample-claude-output.log       # Claude 成功执行输出示例
    ├── sample-claude-interaction.log  # Claude 交互请求示例
    ├── sample-pr-body.txt             # 新建 PR 描述示例
    └── sample-pr-body-updated.txt     # 更新 PR 描述示例
```

## 🧪 测试类型

### 1️⃣ 单元测试 (Unit Tests)

测试独立的 Shell 脚本功能。

**位置**: `unit/`

**运行方法**:
```bash
# 进入单元测试目录
cd .github/tests/unit

# 运行单个测试
./test-setup-branch.sh
./test-setup-env.sh
./test-run-claude.sh

# 或通过绝对路径运行
bash /path/to/project/.github/tests/unit/test-setup-branch.sh
```

**测试覆盖**:
- ✅ `setup-branch.sh` - 分支创建、切换、Git 配置
- ✅ `setup-env.sh` - 环境文件生成、变量注入、格式验证
- ✅ `run-claude.sh` - Claude 执行、交互检测、输出格式

**预期结果**:
```
==========================================
测试总结
==========================================
运行: 60
通过: 60
失败: 0
==========================================
✅ 所有测试通过! ✓
```

### 2️⃣ 集成测试 (Integration Tests)

测试 GitHub Actions 工作流的集成功能。

**位置**: `integration/`

**运行方法**:

使用 GitHub CLI 手动触发工作流：

```bash
# 测试触发器工作流
gh workflow run test-trigger-workflow.yml \
  -f test_scenario=permission_granted \
  -f user_permission=write

gh workflow run test-trigger-workflow.yml \
  -f test_scenario=permission_denied \
  -f user_permission=read

gh workflow run test-trigger-workflow.yml \
  -f test_scenario=issue_comment \
  -f comment_body="@ccai implement health check"

gh workflow run test-trigger-workflow.yml \
  -f test_scenario=pr_comment \
  -f pr_body="Closes #123"

# 测试执行工作流
gh workflow run test-execute-workflow.yml \
  -f test_scenario=branch_creation \
  -f issue_number=999

gh workflow run test-execute-workflow.yml \
  -f test_scenario=env_setup

gh workflow run test-execute-workflow.yml \
  -f test_scenario=change_detection \
  -f mock_changes=true

gh workflow run test-execute-workflow.yml \
  -f test_scenario=interaction_detection

# 查看运行状态
gh run list --workflow=test-trigger-workflow.yml
gh run list --workflow=test-execute-workflow.yml

# 实时查看运行日志
gh run watch
```

**或通过 GitHub UI**:
1. 访问 `Actions` 标签页
2. 选择测试工作流
3. 点击 `Run workflow`
4. 选择测试场景并运行

**测试场景**:

**触发器工作流测试**:
- `permission_granted` - 权限验证通过
- `permission_denied` - 权限验证拒绝
- `issue_comment` - Issue 评论 ID 提取
- `pr_comment` - PR 评论 ID 提取
- `empty_prompt` - 空提示词检测
- `case_insensitive_trigger` - 大小写不敏感触发测试

**执行工作流测试**:
- `branch_creation` - 创建新分支
- `branch_checkout` - 切换已存在分支
- `env_setup` - 环境文件生成
- `change_detection` - 代码变更检测
- `interaction_detection` - 交互请求检测

### 3️⃣ 端到端测试 (E2E Tests)

测试完整的用户场景，从评论触发到 PR 创建。

**位置**: `e2e/test-scenarios.md`

**执行方式**: 手动测试

**测试流程**:
1. 创建真实的 Issue/PR
2. 发表 `@ccai` 评论
3. 观察工作流执行
4. 验证最终结果
5. 记录测试结果

详细场景请参考 `e2e/test-scenarios.md`

## 🚀 快速开始

### 本地运行所有单元测试

```bash
# 方法 1: 依次运行
cd .github/tests/unit
./test-setup-branch.sh && ./test-setup-env.sh && ./test-run-claude.sh

# 方法 2: 一行命令
for test in .github/tests/unit/test-*.sh; do bash "$test"; done
```

### 触发所有集成测试

```bash
# 触发器工作流测试
for scenario in permission_granted permission_denied issue_comment pr_comment case_insensitive_trigger; do
  gh workflow run test-trigger-workflow.yml -f test_scenario=$scenario
done

# 测试大小写不敏感触发（使用不同的评论内容）
gh workflow run test-trigger-workflow.yml \
  -f test_scenario=case_insensitive_trigger \
  -f comment_body="@CCAI implement health check"

gh workflow run test-trigger-workflow.yml \
  -f test_scenario=case_insensitive_trigger \
  -f comment_body="@Ccai add unit tests"

# 执行工作流测试
for scenario in branch_creation env_setup change_detection interaction_detection; do
  gh workflow run test-execute-workflow.yml -f test_scenario=$scenario
done

# 查看运行结果
gh run list --limit 10
```

## 📊 测试覆盖目标

### 单元测试覆盖率
- `setup-branch.sh`: ✅ 100% (14/14 测试通过)
- `setup-env.sh`: ✅ 100% (27/27 测试通过)
- `run-claude.sh`: ✅ 100% (19/19 测试通过)

### 功能覆盖率
- P0 场景 (关键): 100% 目标
- P1 场景 (重要): 80%+ 目标
- P2 场景 (次要): 可选

## 🔍 测试结果验证

### 单元测试成功标准
```
✅ 所有测试通过! ✓
```

### 集成测试成功标准
查看 GitHub Actions 运行日志:
```
✅ 所有测试通过
```

### E2E 测试成功标准
- ✅ 工作流成功完成
- ✅ PR 被创建/更新
- ✅ 代码变更符合预期
- ✅ 评论更新显示正确状态

## 🐛 常见问题

### 单元测试失败

**问题**: Mock 函数行为不正确
**解决**: 检查环境变量设置（如 `MOCK_REMOTE_BRANCH_EXISTS`）

**问题**: GITHUB_OUTPUT 文件权限
**解决**: 确保临时文件可写入

### 集成测试失败

**问题**: 工作流未触发
**解决**:
```bash
# 检查工作流是否启用
gh workflow list

# 启用工作流
gh workflow enable test-trigger-workflow.yml
```

**问题**: 权限错误
**解决**: 确保 GitHub token 有足够权限 (repo, workflow)

### E2E 测试注意事项

**限制**:
- 需要真实的 GitHub 仓库
- 需要配置 `ANTHROPIC_API_KEY` secret
- 会产生真实的 commit 和 PR

**建议**:
- 使用测试仓库或分支
- 测试后清理生成的 PR
- 注意 API 使用限制

## 📚 相关文档

- [测试计划](../../.claude/specs/github-actions-claude-code-automation/test-plan.md) - 完整测试计划和策略
- [工作流文档](../../workflows/README.md) - GitHub Actions 工作流说明
- [脚本文档](../../scripts/ccai/README.md) - Shell 脚本使用说明

## 🤝 贡献测试

### 添加新测试

1. **单元测试**: 在 `unit/` 目录添加 `test-<script-name>.sh`
2. **集成测试**: 在 `integration/` 目录添加工作流文件
3. **E2E 场景**: 在 `e2e/test-scenarios.md` 添加场景描述

### 测试编写规范

**单元测试**:
- 使用 `assert_equals`, `assert_contains` 辅助函数
- Mock 外部依赖（git, GitHub API, Claude CLI）
- 清理临时文件和环境变量
- 提供清晰的测试描述

**集成测试**:
- 使用 `workflow_dispatch` 手动触发
- 提供多种测试场景选择
- 验证关键输出和状态
- 包含测试总结步骤

## ✅ 测试检查清单

运行完整测试前请确认：

- [ ] 已安装必要工具 (bash, git, gh CLI)
- [ ] 单元测试脚本有执行权限 (`chmod +x`)
- [ ] GitHub Actions 已启用
- [ ] 必要的 secrets 已配置（E2E 测试）
- [ ] 熟悉测试场景和预期结果

## 🎯 测试命令速查

```bash
# 单元测试
cd .github/tests/unit && ./test-setup-branch.sh

# 集成测试
gh workflow run test-execute-workflow.yml -f test_scenario=branch_creation

# 查看运行
gh run list --workflow=test-execute-workflow.yml --limit 5
gh run watch <run-id>

# 查看日志
gh run view <run-id> --log

# 清理测试分支
git branch -D issue_999
git push origin --delete issue_999
```

---

**维护者**: 根据代码变更及时更新测试
**文档更新**: 2025-10-25
**测试状态**: ✅ 所有单元测试通过 (60/60)
