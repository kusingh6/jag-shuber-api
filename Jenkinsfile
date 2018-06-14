  // todo: Setup 
  @Library('devops-library') _

  // Edit your app's name below
  def APP_NAME = 'api'
  def PATHFINDER_URL = "192.168.64.2.nip.io"
  def PROJECT_PREFIX = "shuber"
  // Edit your environment TAG names below
  def TAG_NAMES = [
  'dev', 
  'test', 
  'prod'
  ]
  def APP_URLS = [
  "https://${APP_NAME}-${PROJECT_PREFIX}-${TAG_NAMES[0]}.${PATHFINDER_URL}",
  "https://${APP_NAME}-${PROJECT_PREFIX}-${TAG_NAMES[1]}.${PATHFINDER_URL}",
  "https://${APP_NAME}-${PROJECT_PREFIX}-${TAG_NAMES[2]}.${PATHFINDER_URL}"
  ]

  // You shouldn't have to edit these if you're following the conventions
  def ARTIFACT_BUILD = APP_NAME + '-builder-build'
  def RUNTIME_BUILD = PROJECT_PREFIX + '-' + APP_NAME
  def IMAGESTREAM_NAME = APP_NAME
  def SLACK_DEV_CHANNEL="kulpreet_test"
  def SLACK_MAIN_CHANNEL="kulpreet_test"
  // def scmVars = checkout scm
  //def workspace = pwd()

  def hasRepoChanged = false;
  node{
  def lastCommit = getLastCommit()
  if(lastCommit != null){
    // Ensure our CHANGE variables are set
    if(env.CHANGE_AUTHOR_DISPLAY_NAME == null){
      env.CHANGE_AUTHOR_DISPLAY_NAME = lastCommit.author.fullName
    }

    if(env.CHANGE_TITLE == null){
      env.CHANGE_TITLE = getChangeString()
    }
    hasRepoChanged = true;
  }else{
    hasRepoChanged = false;
  }
  }

  //if(hasRepoChanged){
  stage('Build ' + APP_NAME) {
    node{
        // Cheking template exists  or else create
        openshift.withProject() {
          def templateSelector_RUN = openshift.selector( "bc/${RUNTIME_BUILD}" )
          def templateExists_RUN = templateSelector_RUN.exists()

          def templateSelector_ART = openshift.selector( "bc/${ARTIFACT_BUILD}" )
          def templateExists_ART = templateSelector_ART.exists()



          // def apitemplate
          if (!templateExists_ART) { 
            // apitemplate = openshift.create( openshift.process("${WORKSPACE}@script/openshift/templates/api/api-build.json") ).object()
            APIBBUILD_IMG = sh ( """oc process -f "${WORKSPACE}@script/openshift/templates/api-builder/api-builder-build.json" | oc create -f - """)
            echo ">> ${APIBBUILD_IMG}"
          } else {
            echo "${ARTIFACT_BUILD} Template exists"
          }
        
          // def apibuildtemplate
          if (!templateExists_RUN) {
            // apibuildtemplate = openshift.create( openshift.process("${WORKSPACE}@script/openshift/templates/api-builder/api-builder-build.json") ).object()
            APIBUILD_IMG = sh ( """oc process -f "${WORKSPACE}@script/openshift/templates/api/api-build.json" | oc create -f - """)
            echo ">> ${APIBUILD_IMG}"
          } else {
            echo "${RUNTIME_BUILD} Template exists"
            }
        
        try{
          echo "Building: " + ARTIFACT_BUILD
          openshiftBuild bldCfg: ARTIFACT_BUILD, showBuildLogs: 'true'
        
          // Don't tag with BUILD_ID so the pruner can do it's job; it won't delete tagged images.
          // Tag the images for deployment based on the image's hash
          IMAGE_HASH = sh (
          script: """oc get istag ${RUNTIME_BUILD}:latest -o template --template=\"{{.image.dockerImageReference}}\"|awk -F \":\" \'{print \$3}\'""",
          returnStdout: true).trim()
          echo ">> IMAGE_HASH: ${IMAGE_HASH}"

        }catch(error){
          echo "Error in Build"
          // slackNotify(
          //   'Build Broken 🤕',
          //   "The latest ${APP_NAME} build seems to have broken\n'${error.message}'",
        //   'danger',
        //   env.SLACK_HOOK,
        //   SLACK_DEV_CHANNEL,
        //   [
        //     [
        //       type: "button",
        //       text: "View Build Logs",
        //       style:"danger",           
        //       url: "${currentBuild.absoluteUrl}/console"
        //     ]
        //   ])
        throw error
        }
      }
    }
  }


  stage('Deploy ' + TAG_NAMES[0]) {
    def environment = TAG_NAMES[0]
    def url = APP_URLS[0]
    node{
      try{
        openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: environment, srcStream: RUNTIME_BUILD, srcTag: "${IMAGE_HASH}"

        // Check for deployment config for api and postgress in dev environment
        PSTGRESS_IMG = sh ( """oc project ${environment}; oc process -f "${WORKSPACE}@script/openshift/api-postgres-deploy.json" | oc create -f - """)
        echo ">> ${PSTGRESS_IMG}"
        
        // slackNotify(
        //     "New Version in ${environment} 🚀",
        //     "A new version of the ${APP_NAME} is now in ${environment}",
        //     'good',
        //     env.SLACK_HOOK,
        //     SLACK_MAIN_CHANNEL,
        //     [
        //       [
        //         type: "button",
        //         text: "View New Version",         
        //         url: "${url}"
        //       ],
        //       [
        //         type: "button",            
        //         text: "Deploy to Test?",
        //         style: "primary",              
        //         url: "${currentBuild.absoluteUrl}/input"
        //       ]
        //     ])
      }catch(error){
        // slackNotify(
        //   "Couldn't deploy to ${environment} 🤕",
        //   "The latest deployment of the ${APP_NAME} to ${environment} seems to have failed\n'${error.message}'",
        //   'danger',
        //   env.SLACK_HOOK,
        //   SLACK_DEV_CHANNEL,
        //   [
        //     [
        //       type: "button",
        //       text: "View Build Logs",
        //       style:"danger",        
        //       url: "${currentBuild.absoluteUrl}/console"
        //     ]
        //   ])
        echo "Error in DEV"
      }
    }
  }
  stages {
    stage('Deploy ' + TAG_NAMES[1]) {
      def environment = TAG_NAMES[1]
      def url = APP_URLS[1]
      timeout(time:3, unit: 'DAYS'){ input "Deploy to ${environment}?"}
      parallel {
        stage('Deploy Shuber Api') {
          steps{
            // Check for deployment config for api and postgress in dev environment
            PSTGRESS_IMG = sh ( """oc project ${environment}; oc process -f "${WORKSPACE}@script/openshift/api-postgres-deploy.json" | oc create -f - """)
            echo ">> ${PSTGRESS_IMG}"

            // Push image changes to Test
            openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: environment, srcStream: IMAGESTREAM_NAME, srcTag: "${IMAGE_HASH}"
          }
          post {
            success {
              slackNotify(
                "New Version in ${environment} 🚀",
                "A new version of the ${APP_NAME} is now in ${environment}",
              'good',
              env.SLACK_HOOK,
              SLACK_MAIN_CHANNEL,
                [
                  [
                    type: "button",
                    text: "View New Version",           
                    url: "${url}"
                  ],
                ])
            }
            failure {
              slackNotify(
                "Couldn't deploy to ${environment} 🤕",
                "The latest deployment of the ${APP_NAME} to ${environment} seems to have failed\n'${error.message}'",
                'danger',
                env.SLACK_HOOK,
                SLACK_DEV_CHANNEL,
                [
                  [
                    type: "button",
                    text: "View Build Logs",
                    style:"danger",        
                    url: "${currentBuild.absoluteUrl}/console"
                  ]
                ])
              }
            }
          }
        }
        stage('Running integration testing') {
          steps {
            echo " Run test cases here"
          }
          post {
            success {
              echo " Test cleared 🚀"
            }
            failure {
              echo "Test failure alert!! couldn't cleared 🤕"
            }
          }
        }
      }

    }
  
  stage('Deploy ' + TAG_NAMES[1]){
    def environment = TAG_NAMES[1]
    def url = APP_URLS[1]
    timeout(time:3, unit: 'DAYS'){ input "Deploy to ${environment}?"}
    parallel{
      stage('Deploy Shuber Api'){
        node{
          steps{
            
            openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: environment, srcStream: IMAGESTREAM_NAME, srcTag: "${IMAGE_HASH}"
            slackNotify(
                "New Version in ${environment} 🚀",
                "A new version of the ${APP_NAME} is now in ${environment}",
              'good',
              env.SLACK_HOOK,
              SLACK_MAIN_CHANNEL,
                [
                  [
                    type: "button",
                    text: "View New Version",           
                    url: "${url}"
                  ],
                ])
            }   
          }
        }
        stage('Postgress Emphemeral Image'){
          node{
            steps{
              sh "oc process -f "./openshift/posgress-emphemeral.json" $params | oc create -f -"
            }
          }
        }
        stage('Run Test Cases'){
          node{
            steps{
              sh "echo 'Run Test Case scripts here' "
            }
            post{
              always{
                sh "oc process -f "./openshift/posgress-emphemeral.json" $params | oc delete -f -"
              }
            }
          }
        } 
      }
  }
  // stage('Deploy ' + TAG_NAMES[1]){
  //   def environment = TAG_NAMES[1]
  //   def url = APP_URLS[1]
  //   timeout(time:3, unit: 'DAYS'){ input "Deploy to ${environment}?"}
  //   node{
  //     openshiftTag destStream: IMAGESTREAM_NAME, verbose: 'true', destTag: environment, srcStream: IMAGESTREAM_NAME, srcTag: "${IMAGE_HASH}"
  //     slackNotify(
  //         "New Version in ${environment} 🚀",
  //         "A new version of the ${APP_NAME} is now in ${environment}",
  //         'good',
  //         env.SLACK_HOOK,
  //         SLACK_MAIN_CHANNEL,
  //         [
  //           [
  //             type: "button",
  //             text: "View New Version",           
  //             url: "${url}"
  //           ],
  //         ])
  //   }  
  // }
  // }else{
  //   stage('No Changes to Build 👍'){
  //     currentBuild.result = 'SUCCESS'
  //   }
  // }