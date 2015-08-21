#!/bin/bash
######
# run this in crontab
######
# images to workingdir
# build slideshows
# upload slideshows

#DIR="$(dirname "$0")"
KVM_DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )


if [ $# -ne 2 ]
  then
    echo ""
    echo "Error: Wrong arguments supplied"
    echo ""
    echo "USAGE: $0 <workding-dir> <youtube-config>"
    echo ""
    exit 1
fi

WORKING_DIR=$1
YOUTUBE_CONFIG_PATH=$2

echo "hello world. kvm dir = $KVM_DIR"

# 720p = 1280x720
# 1080p = 1920x1080
WIDTH=1280
HEIGHT=720
FRAME_RATE=3
VIDEO_FORMAT="mkv"

# --- Functions ---

function getYoutubeConfigPath {
  # if config path is a directory -> random file from directory
  if [[ -d $YOUTUBE_CONFIG_PATH ]]
  then
    files=($YOUTUBE_CONFIG_PATH/*)
    randomfile=${files[RANDOM % ${#files[@]}]}
    echo $randomfile
  elif [[ -f $YOUTUBE_CONFIG_PATH ]]
  then
    echo $YOUTUBE_CONFIG_PATH
  else
    echo "Invalid Youtube Config path: $YOUTUBE_CONFIG_PATH"
    exit 1
  fi
}

# --- Program ---

# [-d WORKING-DIR] [-n NUMBER-OF-ACTORS] [--names NAMES-JSON-PATH] [--debug] [--info]
node $KVM_DIR/IMDBScraper/bot.js -d $WORKING_DIR -n 1 --names $WORKING_DIR/names.json --debug

# -d <working-dir> -a <audio-path> [-w <width>] [-h <height>] [-r <frame-rate>] [-y delete]
source $KVM_DIR/CmdLineSlideShow/makeslideshow.sh -d $WORKING_DIR -a $WORKING_DIR/audio -w $WIDTH -h $HEIGHT -r $FRAME_RATE -f $VIDEO_FORMAT

# Upload all video files from project directories.
#node ytvideoupload.js <video-file> <video-title> <video-description> [<config-json>]

if [ $(find $WORKING_DIR -maxdepth 0 -type d -empty 2>/dev/null) ] # Is working empty?
then
  echo "Working Directory is empty."
  exit 1
else
  for PROJECT_DIR in $WORKING_DIR/*; do # Loop subdirectories
    PROJECT_NAME=`basename $PROJECT_DIR`

    OUTPUT_FILENAME="$PROJECT_DIR/$PROJECT_NAME.$VIDEO_FORMAT"
    TITLE_FILENAME="$PROJECT_DIR/title.txt"
    DESCRIPTION_FILENAME="$PROJECT_DIR/description.txt"

    # if
    # a) is directory
    # b) has video, title, description
    # c) has images directory
    if ([[ -d $PROJECT_DIR ]] && [[ -f $OUTPUT_FILENAME ]] && [[ -f $TITLE_FILENAME ]] && [[ -f $DESCRIPTION_FILENAME ]])
    then
      echo $PROJECT_NAME

      TITLE=`cat $TITLE_FILENAME`
      DESCRIPTION=`cat $DESCRIPTION_FILENAME`

      #### TODO random youtube config (by channel)
      $CONFIG_PATH=`getYoutubeConfigPath`
      node $KVM_DIR/YoutubeUpload.js $OUTPUT_FILENAME "$TITLE" "$DESCRIPTION" $CONFIG_PATH
      # clean up
      # rm -R $PROJECT_DIR
    else
      echo "$PROJECT_DIR is not valid"
    fi
  done
fi

# Clean up

echo "bye bye"
