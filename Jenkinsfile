pipeline {
    agent any
    
    triggers {
        GenericTrigger(
            genericVariables: [
                [key: 'ref', value: '$.ref'],
                [key: 'repository', value: '$.repository.full_name']
            ],
            causeString: 'Triggered by GitHub push',
            token: 'kahoot-clone-webhook-token',
            printContributedVariables: true,
            printPostContent: true,
            regexpFilterText: '$ref',
            regexpFilterExpression: 'refs/heads/(main|master|fix/.*)'
        )
    }
    
    environment {
        // AWS ECR Configuration
        AWS_REGION = 'us-east-1'
        AWS_ACCOUNT_ID = '802346121373'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        
        PROJECT_NAME = 'kahoot-clone'
        BUILD_VERSION = "${env.BUILD_NUMBER}"
        GIT_COMMIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
        
        // BuildKit for faster builds with cache
        DOCKER_BUILDKIT = '1'
        BUILDKIT_PROGRESS = 'plain'
        
        // Parallelization settings (optimized for t3.medium 4GB RAM)
        // For t3.large (8GB), increase to: PARALLEL_BUILD_JOBS='4', NPM_INSTALL_CONCURRENCY='8'
        PARALLEL_BUILD_JOBS = '2'
        PARALLEL_DEPLOY_JOBS = '2'
        NPM_INSTALL_CONCURRENCY = '4'
        
        // SonarQube Configuration
        SONARQUBE_URL = 'http://34.200.233.56:30900'
        // SONAR_TOKEN will be loaded conditionally in the stage
        
        // Trivy Configuration
        TRIVY_SEVERITY = 'CRITICAL,HIGH'
        TRIVY_EXIT_CODE = '0'  // Don't fail build, just report
        
        // Nx Configuration
        NX_BRANCH = 'main'
        NX_CACHE_BUCKET = "kahoot-nx-cache-${AWS_ACCOUNT_ID}"
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        disableConcurrentBuilds()
        parallelsAlwaysFailFast()
    }
    
    tools {
        git 'Default'
    }
    
    stages {
        stage(' Initialization') {
            steps {
                script {
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo "  Pipeline Started (Nx + AWS ECR)"
                    echo " Nx Smart Builds Enabled"
                    echo " Commit: ${env.GIT_COMMIT_SHORT}"
                    echo " Build: ${BUILD_VERSION}"
                    echo " ECR: ${ECR_REGISTRY}"
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    
                    checkout scm
                }
            }
        }
        
        stage(' Setup Nx') {
            steps {
                script {
                    echo " Installing Nx and dependencies..."
                    sh '''
                        # Install Nx at root level
                        npm install -D nx@latest @nx/js@latest @nx/workspace@latest nx-remotecache-s3@latest
                        
                        # Create S3 bucket for cache if not exists
                        aws s3 mb s3://${NX_CACHE_BUCKET} --region ${AWS_REGION} 2>/dev/null || true
                        
                        # Set lifecycle policy (delete cache after 7 days)
                        aws s3api put-bucket-lifecycle-configuration \
                          --bucket ${NX_CACHE_BUCKET} \
                          --lifecycle-configuration '{
                            "Rules": [{
                              "Id": "DeleteOldCache",
                              "Status": "Enabled",
                              "Prefix": "nx-cache/",
                              "Expiration": {"Days": 7}
                            }]
                          }' 2>/dev/null || true
                        
                        echo " Nx setup complete with S3 remote cache"
                    '''
                }
            }
        }
        
        stage(' Detect Affected Services') {
            steps {
                script {
                    echo " Detecting affected services with Nx..."
                    
                    // Get affected projects using new Nx 19+ command
                    def affectedApps = sh(
                        script: '''
                            npx nx show projects --affected --base=HEAD~1 --head=HEAD 2>/dev/null || echo ""
                        ''',
                        returnStdout: true
                    ).trim()
                    
                    // Validate output (check if it's error message or valid projects)
                    if (affectedApps.isEmpty() || affectedApps == "" || affectedApps.contains("Cannot find") || affectedApps.contains("NX")) {
                        env.AFFECTED_SERVICES = ""
                        env.SKIP_BUILD = "true"
                        echo " No affected services detected"
                        echo " Only non-service files changed (docs, terraform, configs, etc.)"
                        echo " Pipeline will skip build/deploy stages"
                    } else {
                        // Clean and validate project names
                        def validProjects = []
                        affectedApps.split('\n').each { project ->
                            project = project.trim()
                            if (project && !project.isEmpty() && !project.startsWith("NX")) {
                                validProjects.add(project)
                            }
                        }
                        
                        if (validProjects.isEmpty()) {
                            env.AFFECTED_SERVICES = ""
                            env.SKIP_BUILD = "true"
                            echo " No valid affected services found"
                        } else {
                            env.AFFECTED_SERVICES = validProjects.join(',')
                            env.SKIP_BUILD = "false"
                            echo " Affected services: ${env.AFFECTED_SERVICES}"
                        }
                    }
                    
                    // Display affected summary
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo " AFFECTED SERVICES (Nx Detection)"
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    if (env.AFFECTED_SERVICES == "") {
                        echo "   (none - only infrastructure/docs changed)"
                    } else {
                        env.AFFECTED_SERVICES.split(',').each { service ->
                            echo "   ${service}"
                        }
                    }
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                }
            }
        }
        
        stage(' Security Scan') {
            parallel {
                stage('Trivy Repository Scan') {
                    steps {
                        script {
                            echo " Trivy: Scanning repository for vulnerabilities..."
                            sh """
                                # Scan repository for filesystem vulnerabilities
                                trivy fs --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  --skip-dirs node_modules \
                                  --timeout 10m \
                                  . || true
                            """
                        }
                    }
                }
                
                stage('SonarQube Analysis') {
                    steps { 
                        script {
                            try {
                                echo " Running SonarQube analysis..."
                                // Try to load token from credentials
                                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                                    sh '''
                                        # Set JAVA_HOME to Java 17
                                        export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
                                        export PATH=$JAVA_HOME/bin:$PATH
                                        
                                        # Verify Java version
                                        echo " Java version:"
                                        java -version
                                        
                                        # Download and use SonarScanner CLI (supports Java 17+)
                                        SCANNER_VERSION="5.0.1.3006"
                                        SCANNER_DIR="${HOME}/sonar-scanner-${SCANNER_VERSION}"
                                        
                                        if [ ! -d "${SCANNER_DIR}" ]; then
                                            echo " Downloading SonarScanner ${SCANNER_VERSION}..."
                                            cd /tmp
                                            wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SCANNER_VERSION}-linux.zip
                                            unzip -q sonar-scanner-cli-${SCANNER_VERSION}-linux.zip
                                            mv sonar-scanner-${SCANNER_VERSION}-linux ${SCANNER_DIR}
                                            chmod +x ${SCANNER_DIR}/bin/sonar-scanner
                                            rm -f sonar-scanner-cli-${SCANNER_VERSION}-linux.zip
                                            cd ${WORKSPACE}
                                            echo " SonarScanner installed to ${SCANNER_DIR}"
                                        else
                                            echo " SonarScanner already exists at ${SCANNER_DIR}"
                                        fi
                                        
                                        # Add to PATH
                                        export PATH=${SCANNER_DIR}/bin:$PATH
                                        
                                        echo " Running SonarQube scan from workspace..."
                                        sonar-scanner \
                                          -Dsonar.projectKey=kahoot-clone \
                                          -Dsonar.projectName="Kahoot Clone" \
                                          -Dsonar.sources=. \
                                          -Dsonar.exclusions=**/node_modules/**,**/build/**,**/dist/**,**/coverage/**,**/.nx/**,**/infrastructure/**,**/tmp/**,**/temp/** \
                                          -Dsonar.host.url=${SONARQUBE_URL} \
                                          -Dsonar.token=${SONAR_TOKEN} \
                                          -Dsonar.sourceEncoding=UTF-8 \
                                          -Dsonar.qualitygate.wait=false || true
                                        
                                        echo " SonarQube analysis complete"
                                    '''
                                }
                            } catch (Exception e) {
                                echo " SonarQube analysis skipped: ${e.message}"
                                echo "To enable: Configure 'sonarqube-token' credential in Jenkins"
                            }
                        }
                    }
                }
            }
        }
        
        stage(' ECR Login') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            steps {
                script {
                    echo " Logging into AWS ECR..."
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    """
                    echo " ECR login successful"
                }
            }
        }
        
        stage(' Install Dependencies & Static Analysis') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            steps {
                script {
                    def affectedList = env.AFFECTED_SERVICES.split(',')
                    def installSteps = [:]
                    
                    echo " Installing dependencies for affected services..."
                    
                    if (affectedList.contains('gateway')) {
                        installSteps['Gateway'] = {
                            dir('gateway') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (affectedList.contains('auth-service')) {
                        installSteps['Auth Service'] = {
                            dir('services/auth-service') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (affectedList.contains('user-service')) {
                        installSteps['User Service'] = {
                            dir('services/user-service') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (affectedList.contains('quiz-service')) {
                        installSteps['Quiz Service'] = {
                            dir('services/quiz-service') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (affectedList.contains('game-service')) {
                        installSteps['Game Service'] = {
                            dir('services/game-service') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (affectedList.contains('analytics-service')) {
                        installSteps['Analytics Service'] = {
                            dir('services/analytics-service') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (affectedList.contains('frontend')) {
                        installSteps['Frontend'] = {
                            dir('frontend') {
                                sh "npm ci --prefer-offline --no-audit --maxsockets=2 --loglevel=error"
                            }
                        }
                    }
                    
                    if (installSteps.size() > 0) {
                        parallel installSteps
                    } else {
                        echo " No affected services to install dependencies"
                    }
                }
            }
        }
        
        stage(' Build & Push Images - Batch 1') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            steps {
                script {
                    def affectedList = env.AFFECTED_SERVICES.split(',')
                    def buildSteps = [:]
                    
                    if (affectedList.contains('gateway')) {
                        buildSteps['Gateway'] = {
                            echo " Building Gateway with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-gateway:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-gateway:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-gateway:latest \
                                  --push \
                                  -f gateway/Dockerfile gateway/
                            """
                        }
                    }
                    
                    if (affectedList.contains('auth-service')) {
                        buildSteps['Auth Service'] = {
                            echo " Building Auth Service with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-auth:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-auth:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-auth:latest \
                                  --push \
                                  -f services/auth-service/Dockerfile services/auth-service/
                            """
                        }
                    }
                    
                    if (affectedList.contains('user-service')) {
                        buildSteps['User Service'] = {
                            echo " Building User Service with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-user:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-user:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-user:latest \
                                  --push \
                                  -f services/user-service/Dockerfile services/user-service/
                            """
                        }
                    }
                    
                    if (affectedList.contains('quiz-service')) {
                        buildSteps['Quiz Service'] = {
                            echo " Building Quiz Service with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-quiz:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-quiz:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-quiz:latest \
                                  --push \
                                  -f services/quiz-service/Dockerfile services/quiz-service/
                            """
                        }
                    }
                    
                    if (buildSteps.size() > 0) {
                        parallel buildSteps
                    } else {
                        echo " No affected services in Batch 1 to build"
                    }
                }
            }
        }
        
        stage(' Build & Push Images - Batch 2') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            steps {
                script {
                    def affectedList = env.AFFECTED_SERVICES.split(',')
                    def buildSteps = [:]
                    
                    if (affectedList.contains('game-service')) {
                        buildSteps['Game Service'] = {
                            echo " Building Game Service with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-game:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-game:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-game:latest \
                                  --push \
                                  -f services/game-service/Dockerfile services/game-service/
                            """
                        }
                    }
                    
                    if (affectedList.contains('analytics-service')) {
                        buildSteps['Analytics Service'] = {
                            echo " Building Analytics Service with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-analytics:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-analytics:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-analytics:latest \
                                  --push \
                                  -f services/analytics-service/Dockerfile services/analytics-service/
                            """
                        }
                    }
                    
                    if (affectedList.contains('frontend')) {
                        buildSteps['Frontend'] = {
                            echo " Building Frontend with cache..."
                            sh """
                                docker buildx build \
                                  --cache-from ${ECR_REGISTRY}/${PROJECT_NAME}-frontend:latest \
                                  --cache-to type=inline \
                                  --build-arg BUILDKIT_INLINE_CACHE=1 \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-frontend:${BUILD_VERSION} \
                                  -t ${ECR_REGISTRY}/${PROJECT_NAME}-frontend:latest \
                                  --push \
                                  -f frontend/Dockerfile frontend/
                            """
                        }
                    }
                    
                    if (buildSteps.size() > 0) {
                        parallel buildSteps
                    } else {
                        echo " No affected services in Batch 2 to build"
                    }
                }
            }
        }
        
        stage(' Security Scan - Images') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            steps {
                script {
                    def affectedList = env.AFFECTED_SERVICES.split(',')
                    def scanSteps = [:]
                    
                    if (affectedList.contains('gateway')) {
                        scanSteps['Trivy - Gateway'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-gateway:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (affectedList.contains('auth-service')) {
                        scanSteps['Trivy - Auth'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-auth:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (affectedList.contains('user-service')) {
                        scanSteps['Trivy - User'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-user:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (affectedList.contains('quiz-service')) {
                        scanSteps['Trivy - Quiz'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-quiz:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (affectedList.contains('game-service')) {
                        scanSteps['Trivy - Game'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-game:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (affectedList.contains('analytics-service')) {
                        scanSteps['Trivy - Analytics'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-analytics:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (affectedList.contains('frontend')) {
                        scanSteps['Trivy - Frontend'] = {
                            sh """
                                trivy image --severity ${TRIVY_SEVERITY} \
                                  --exit-code ${TRIVY_EXIT_CODE} \
                                  --format table \
                                  ${ECR_REGISTRY}/${PROJECT_NAME}-frontend:${BUILD_VERSION} || true
                            """
                        }
                    }
                    
                    if (scanSteps.size() > 0) {
                        parallel scanSteps
                    } else {
                        echo " No affected services to scan"
                    }
                }
            }
        }
        
        stage(' Pre-Deployment Validation') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            parallel {
                stage('Generate Security Report') {
                    steps {
                        script {
                            sh """
                                echo "=== SECURITY SCAN SUMMARY ===" > security-report.txt
                                echo "Build: ${BUILD_VERSION}" >> security-report.txt
                                echo "Commit: ${GIT_COMMIT_SHORT}" >> security-report.txt
                                echo "" >> security-report.txt
                                
                                if [ -f trivy-repo-scan.json ]; then
                                    echo "Repository Scan Results:" >> security-report.txt
                                    cat trivy-repo-scan.json | jq -r '.Results[].Vulnerabilities[] | select(.Severity=="CRITICAL" or .Severity=="HIGH") | "- \\(.VulnerabilityID): \\(.PkgName) (\\(.Severity))"' >> security-report.txt || true
                                fi
                            """
                            archiveArtifacts artifacts: 'security-report.txt,trivy-*.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
        
        stage(' Deploy to Kubernetes') {
            when {
                expression { env.SKIP_BUILD != 'true' }
            }
            steps {
                script {
                    echo " Deploying to Kubernetes via SSH..."
                    
                    // Create ECR secret locally first (Jenkins has AWS CLI)
                    echo " Creating ECR pull secret YAML..."
                    sh """
                        # Get ECR login token
                        ECR_TOKEN=\$(aws ecr get-login-password --region ${AWS_REGION})
                        
                        # Create secret YAML file
                        kubectl create secret docker-registry ecr-registry-secret \
                          --docker-server=${ECR_REGISTRY} \
                          --docker-username=AWS \
                          --docker-password="\${ECR_TOKEN}" \
                          --namespace=kahoot-clone \
                          --dry-run=client -o yaml > /tmp/ecr-secret.yaml
                    """
                    
                    withCredentials([sshUserPrivateKey(credentialsId: 'k8s-master-ssh-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER')]) {
                        sh """
                            # Copy secret to K8s master
                            scp -i \${SSH_KEY} -o StrictHostKeyChecking=no /tmp/ecr-secret.yaml ubuntu@98.84.105.168:/tmp/
                            
                            # Deploy via SSH to K8s master node
                            ssh -i \${SSH_KEY} -o StrictHostKeyChecking=no ubuntu@98.84.105.168 << 'ENDSSH'
                                # Setup Git repo on master node if not exists
                                if [ ! -d ~/kahoot-repo ]; then
                                    echo " Cloning repository for the first time..."
                                    git clone https://github.com/Thang141104/DevOps-Kahoot-Clone.git ~/kahoot-repo
                                else
                                    echo " Updating repository..."
                                    cd ~/kahoot-repo
                                    git fetch origin
                                    git checkout fix/auth-routing-issues
                                    git pull origin fix/auth-routing-issues
                                fi
                                
                                cd ~/kahoot-repo
                                
                                echo "� Checking deployments..."
                                DEPLOY_COUNT=\$(kubectl get deployments -n kahoot-clone --no-headers 2>/dev/null | wc -l)
                                
                                # Download secrets from S3
                                echo " Downloading secrets from S3..."
                                aws s3 cp s3://kahoot-clone-secrets-802346121373/secrets.yaml k8s/secrets.yaml
                                
                                if [ "\$DEPLOY_COUNT" -eq 0 ]; then
                                    echo " No deployments found. Creating initial deployments..."
                                    
                                    # Apply namespace and configmap first
                                    kubectl apply -f k8s/base/namespace.yaml
                                    kubectl apply -f k8s/base/configmap.yaml
                                    
                                    # Apply ECR secret after namespace created
                                    echo " Applying ECR pull secret..."
                                    kubectl apply -f /tmp/ecr-secret.yaml
                                    echo " ECR secret updated"
                                    
                                    # Apply app secrets from S3
                                    echo " Applying application secrets..."
                                    kubectl apply -f k8s/secrets.yaml

                                    
                                    # Apply all service deployments
                                    kubectl apply -f k8s/services/gateway-deployment.yaml
                                    kubectl apply -f k8s/services/auth-deployment.yaml
                                    kubectl apply -f k8s/services/user-deployment.yaml
                                    kubectl apply -f k8s/services/quiz-deployment.yaml
                                    kubectl apply -f k8s/services/game-deployment.yaml
                                    kubectl apply -f k8s/services/analytics-deployment.yaml
                                    kubectl apply -f k8s/frontend/frontend-deployment.yaml
                                    
                                    echo " Initial deployments created!"
                                else
                                    echo " Deployments already exist. Updating secrets and re-applying..."
                                    
                                    # Update ECR secret for existing namespace
                                    echo " Updating ECR pull secret..."
                                    kubectl apply -f /tmp/ecr-secret.yaml
                                    echo " ECR secret updated"
                                    
                                    # Update app secrets from S3
                                    echo " Updating application secrets..."
                                    kubectl apply -f k8s/secrets.yaml
                                    
                                    # Re-apply deployments with updated imagePullSecrets
                                    kubectl apply -f k8s/services/gateway-deployment.yaml
                                    kubectl apply -f k8s/services/auth-deployment.yaml
                                    kubectl apply -f k8s/services/user-deployment.yaml
                                    kubectl apply -f k8s/services/quiz-deployment.yaml
                                    kubectl apply -f k8s/services/game-deployment.yaml
                                    kubectl apply -f k8s/services/analytics-deployment.yaml
                                    kubectl apply -f k8s/frontend/frontend-deployment.yaml
                                    echo " Deployments re-applied!"
                                fi
                                
                                echo "\n Current deployments:"
                                kubectl get deployments -n kahoot-clone
                                
                                echo "\n Updating image tags for affected services to build ${BUILD_VERSION}..."
                                # Update image tags only for affected services
                                AFFECTED_SERVICES="${AFFECTED_SERVICES}"
                                
                                if [[ "\$AFFECTED_SERVICES" == *"gateway"* ]]; then
                                    echo "Updating gateway..."
                                    kubectl set image deployment/gateway \
                                      gateway=${ECR_REGISTRY}/${PROJECT_NAME}-gateway:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update gateway"
                                fi
                                
                                if [[ "\$AFFECTED_SERVICES" == *"auth-service"* ]]; then
                                    echo "Updating auth-service..."
                                    kubectl set image deployment/auth-service \
                                      auth-service=${ECR_REGISTRY}/${PROJECT_NAME}-auth:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update auth-service"
                                fi
                                
                                if [[ "\$AFFECTED_SERVICES" == *"user-service"* ]]; then
                                    echo "Updating user-service..."
                                    kubectl set image deployment/user-service \
                                      user-service=${ECR_REGISTRY}/${PROJECT_NAME}-user:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update user-service"
                                fi
                                
                                if [[ "\$AFFECTED_SERVICES" == *"quiz-service"* ]]; then
                                    echo "Updating quiz-service..."
                                    kubectl set image deployment/quiz-service \
                                      quiz-service=${ECR_REGISTRY}/${PROJECT_NAME}-quiz:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update quiz-service"
                                fi
                                
                                if [[ "\$AFFECTED_SERVICES" == *"game-service"* ]]; then
                                    echo "Updating game-service..."
                                    kubectl set image deployment/game-service \
                                      game-service=${ECR_REGISTRY}/${PROJECT_NAME}-game:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update game-service"
                                fi
                                
                                if [[ "\$AFFECTED_SERVICES" == *"analytics-service"* ]]; then
                                    echo "Updating analytics-service..."
                                    kubectl set image deployment/analytics-service \
                                      analytics-service=${ECR_REGISTRY}/${PROJECT_NAME}-analytics:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update analytics-service"
                                fi
                                
                                if [[ "\$AFFECTED_SERVICES" == *"frontend"* ]]; then
                                    echo "Updating frontend..."
                                    kubectl set image deployment/frontend \
                                      frontend=${ECR_REGISTRY}/${PROJECT_NAME}-frontend:${BUILD_VERSION} \
                                      -n kahoot-clone || echo "  Warning: Failed to update frontend"
                                fi
                                
                                echo "\n Cleaning up failed/old pods..."
                                # Delete pods with ImagePullBackOff or ErrImagePull
                                kubectl get pods -n kahoot-clone --field-selector=status.phase!=Running,status.phase!=Pending | grep -E 'ImagePullBackOff|ErrImagePull|Error|Terminating' | awk '{print \$1}' | xargs -r kubectl delete pod -n kahoot-clone || true
                                
                                # Force rollout restart only for affected services
                                echo "\n Forcing rollout restart for affected services..."
                                IFS=',' read -ra SERVICES <<< "\$AFFECTED_SERVICES"
                                for service in "\${SERVICES[@]}"; do
                                    # Map service names to deployment names
                                    case "\$service" in
                                        "gateway") deployment="gateway" ;;
                                        "auth-service") deployment="auth-service" ;;
                                        "user-service") deployment="user-service" ;;
                                        "quiz-service") deployment="quiz-service" ;;
                                        "game-service") deployment="game-service" ;;
                                        "analytics-service") deployment="analytics-service" ;;
                                        "frontend") deployment="frontend" ;;
                                        *) deployment="" ;;
                                    esac
                                    
                                    if [ -n "\$deployment" ]; then
                                        echo "Restarting \$deployment..."
                                        kubectl rollout restart deployment/\${deployment} -n kahoot-clone || true
                                    fi
                                done
                                
                                echo "\n Waiting for rollout to complete (60s)..."
                                sleep 60
                                
                                echo "\n Deployment updated:"
                                kubectl get deployments -n kahoot-clone
                                echo "\n Pods status:"
                                kubectl get pods -n kahoot-clone
ENDSSH
                        """
                    }
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo " Pipeline completed successfully!"
                echo " Images: ${ECR_REGISTRY}/${PROJECT_NAME}-*:${BUILD_VERSION}"
                echo " SonarQube: ${SONARQUBE_URL}"
                echo " Security reports archived"
            }
        }
        failure {
            echo " Pipeline failed!"
        }
        always {
            // Cleanup
            sh 'docker system prune -f --volumes || true'
            archiveArtifacts artifacts: '**/*.json', allowEmptyArchive: true
        }
    }
}
